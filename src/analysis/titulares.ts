/**
 * Titulares · alternativas con la experiencia medida y la competencia.
 *
 * El redactor pasa un titular (y, si quiere, el texto). Devolvemos alternativas
 * por canal con palanca, estructura, tiempo verbal, longitud contra el rango
 * medido y el porqué. Todo pasa por el validador antes de salir.
 *
 * Fuentes de "experiencia":
 *  - titulares-experiencia.json: reglas con cifras medidas en Search Console
 *    (se expresan sin nombrar cabeceras).
 *  - El estado de la app: titulares de la competencia que están entrando en
 *    Discover en esta instancia (top por score, últimos días) y las fórmulas
 *    dominantes (n-gramas). Esto es lo que "aprende" cada semana.
 *
 * Modelo: TITULARES_BACKEND=claude (Anthropic SDK, por defecto si hay
 * ANTHROPIC_API_KEY) o TITULARES_BACKEND=ollama (OLLAMA_URL, OLLAMA_MODEL).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { Redis } from '@upstash/redis';
import { getState } from '../state/store.js';

export type Canal = 'discover' | 'search' | 'portada' | 'redes';

export interface Propuesta {
  texto: string;
  canal: Canal;
  angulo: string;
  palanca: string;
  estructura: string;
  tiempo_verbal: string;
  fuente: string;
  por_que: string;
  medidas?: Medidas;
  validador?: Validacion;
}

export interface Medidas {
  caracteres: number;
  palabras: number;
  cita: boolean;
  cifra: boolean;
  dos_puntos: boolean;
  nombre_cargo_cita: boolean;
  abre_por: 'nombre propio' | 'artículo' | 'comillas' | 'número' | 'otro';
}

export interface Validacion {
  estado: 'PASA' | 'AVISO' | 'FALLA';
  bloquea: string[];
  avisa: string[];
}

export interface RespuestaTitulares {
  original: { texto: string; medidas: Medidas; analisis: Record<string, string> };
  propuestas: Propuesta[];
  descartes: string[];
  experiencia: string;
  rangos: Record<string, [number, number]>;
  competencia: { ejemplos: number; formulas: string[]; patrones: number; plantillas: number; ventana_dias: number };
  modelo: string;
  segundos: number;
}

interface Experiencia {
  nombre: string;
  rangos: Record<string, [number, number]>;
  reglas_medidas: string[];
  ejemplos: string[];
}

// ---------------------------------------------------------------- experiencia

let EXPERIENCIA: Record<string, Experiencia> | null = null;

function cargarExperiencia(): Record<string, Experiencia> {
  if (EXPERIENCIA) return EXPERIENCIA;
  const candidatos = [
    path.join(process.cwd(), 'titulares-experiencia.json'),
    path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..', 'titulares-experiencia.json'),
  ];
  for (const p of candidatos) {
    try {
      const raw = JSON.parse(readFileSync(p, 'utf-8'));
      delete raw._nota;
      EXPERIENCIA = raw;
      return raw;
    } catch { /* siguiente */ }
  }
  throw new Error('No se encuentra titulares-experiencia.json');
}

export function perfilInstancia(): string {
  const inst = (process.env.INSTANCE_NAME || 'main').toLowerCase();
  return inst === 'motor' ? 'motor' : 'actualidad';
}

// ---------------------------------------------------------------- competencia

const NO_EDITORIAL = /^(x|x \(twitter\)|twitter|threads|youtube|facebook|instagram|tiktok|reddit)$/i;

function dominiosPropios(): string[] {
  return (process.env.OWN_MEDIA_DOMAINS || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

export interface Competencia {
  ejemplos: string[];      // titulares reales de otros medios, top por tracción, últimos días
  formulas: string[];      // n-gramas dominantes en los titulares que entran (headlinePatterns)
  patrones: string[];      // patrones históricos por categoría del vertical: n-gramas, verbos, entidades
  plantillas: string[];    // fórmulas editoriales del catálogo (headline-formulas.json) para el perfil
}

const TOPICS_POR_PERFIL: Record<string, string[]> = {
  actualidad: ['legal', 'sucesos', 'politica', 'economia', 'salud', 'tech', 'entretenimiento'],
  motor: ['motor', 'legal', 'tech', 'economia'],
};

/** Fórmulas editoriales del catálogo (las que alimentan la pestaña Fórmulas). */
export function plantillasCatalogo(perfil: string, max = 12): string[] {
  const candidatos = [
    path.join(process.cwd(), 'headline-formulas.json'),
    path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..', 'headline-formulas.json'),
  ];
  let rules: Array<{ match: { type?: string; topic?: string }; lines: string[] }> = [];
  for (const p of candidatos) {
    try { rules = JSON.parse(readFileSync(p, 'utf-8')).rules || []; break; } catch { /* siguiente */ }
  }
  const prefer = TOPICS_POR_PERFIL[perfil] || TOPICS_POR_PERFIL.actualidad;
  const out: string[] = [];
  const vistos = new Set<string>();
  const push = (l: string) => { const k = l.toLowerCase(); if (!vistos.has(k) && out.length < max) { vistos.add(k); out.push(l); } };
  for (const t of prefer) for (const r of rules) if ((r.match.topic || '').toLowerCase() === t) r.lines.forEach(push);
  if (out.length < max) for (const r of rules) if (!r.match.topic) r.lines.forEach(push);
  return out;
}

/** Patrones históricos por categoría del vertical (los de la pestaña Patrones · Categoría). */
function patronesDesdeEstado(state: any, max = 10): string[] {
  const out: string[] = [];
  const prefixes = (process.env.DS_CATEGORY_FILTER || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const hist = state?.categoryPatternsHistorical;
  if (hist?.categories) {
    const filas = Object.entries(hist.categories as Record<string, any>)
      .filter(([name]) => !prefixes.length || prefixes.some(p => name.toLowerCase().startsWith(p)))
      .sort((a, b) => (b[1].articleCount || 0) - (a[1].articleCount || 0)).slice(0, 3);
    for (const [name, row] of filas) {
      const ng = (row.topNgrams || []).slice(0, 5).map((p: any) => p.ngram).join(', ');
      const verbos = (row.topVerbs || []).slice(0, 5).map((v: any) => v.verb).join(', ');
      const ents = (row.topEntities || []).slice(0, 5).map((e: any) => e.name).join(', ');
      if (ng || verbos) out.push(`${name} (${row.articleCount || 0} piezas): fórmulas ${ng || '—'}; verbos ${verbos || '—'}; entidades ${ents || '—'}`);
    }
  }
  const pub = state?.publisherPatternsHistorical;
  if (pub?.patterns) {
    const propios = dominiosPropios();
    const filas = Object.entries(pub.patterns as Record<string, any>)
      .filter(([dom]) => !propios.some(d => dom.toLowerCase().endsWith(d)))
      .sort((a, b) => (b[1].articleCount || 0) - (a[1].articleCount || 0)).slice(0, 4);
    for (const [dom, row] of filas) {
      const ng = (row.topNgrams || []).slice(0, 4).map((p: any) => p.ngram).join(', ');
      if (ng) out.push(`${row.displayName || dom}: ${ng}`);
    }
  }
  return out.slice(0, max);
}

/** Titulares de la competencia que están entrando en Discover en esta instancia. */
export function competenciaDesdeEstado(perfil: string, dias = 7, max = 15): Competencia {
  let state: ReturnType<typeof getState> | null = null;
  try { state = getState(); } catch { state = null; }
  const plantillas = plantillasCatalogo(perfil);
  if (!state) return { ejemplos: [], formulas: [], patrones: [], plantillas };

  const propios = dominiosPropios();
  const desde = Date.now() - dias * 86400_000;
  const vistos = new Set<string>();
  const cand: Array<{ title: string; score: number }> = [];
  for (const [url, p] of Object.entries(state.pages || {})) {
    if (!p?.title) continue;
    const fecha = Date.parse(p.firstSeen || p.lastUpdated || '');
    if (fecha && fecha < desde) continue;
    if (p.publisher && NO_EDITORIAL.test(p.publisher.trim())) continue;
    const dom = (p.domain || safeHost(url)).toLowerCase();
    if (propios.some(d => dom.endsWith(d))) continue;
    const clave = p.title.trim().toLowerCase().slice(0, 60);
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    cand.push({ title: p.title.trim(), score: p.score || 0 });
  }
  cand.sort((a, b) => b.score - a.score);
  const formulas = Object.entries(state.headlinePatterns || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([ngram]) => ngram);
  return { ejemplos: cand.slice(0, max).map(c => c.title), formulas, patrones: patronesDesdeEstado(state), plantillas };
}

function safeHost(u: string): string {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; }
}

// ---------------------------------------------------------------- prompt

const PALANCAS = `Curiosidad (brecha entre lo que insinúa y lo que el lector sabe; se abre, no se cierra) ·
Extrañeza (rompe el esquema esperado) · Intimidad (algo privado, dicho en confianza, primera persona) ·
Identificación (el lector se ve a sí mismo; lo cotidiano) · Contradicción (choca con lo que se da por hecho) ·
Autoridad inesperada (importa quién lo dice: el mecánico, el que estaba delante) · Detalle revelador (la cosa
pequeña y concreta que abre un mundo) · Confidencia (se dice en voz alta lo que se comentaba por lo bajo) ·
Comparación insólita (una imagen que explica el hecho mejor que el hecho) · Cifra ancla (un número que descoloca
y que el titular no termina de explicar) · Consecuencia (no el hecho, sino lo que cambia después) ·
Cuenta pendiente (algo quedó sin saldar y sigue ahí).`;

export const LISTA_NEGRA = ['sin duda', 'cabe destacar', 'cabe señalar', 'en definitiva', 'no te pierdas', 'así es ',
  'todo lo que debes saber', 'todo lo que necesitas saber', 'estos son los', 'brutal', 'bestial', 'espectacular',
  'revoluciona', 'impresionante', 'increíble', 'alucinante', 'no lo vas a creer', 'te sorprenderá', 'lo que nadie te cuenta'];

const CLICKBAIT: Array<[RegExp, string]> = [
  [/[!¡]/, 'exclamación'], [/\?/, 'interrogación'], [/\b[A-ZÁÉÍÓÚÑ]{4,}\b/, 'mayúsculas sostenidas'],
  [/^\d/, 'empieza por número'], [/\.\.\.|…/, 'puntos suspensivos'],
  [/\b(increíble|alucinante|no lo vas a creer|te sorprenderá)\b/i, 'léxico gancho'],
];

function systemPrompt(exp: Experiencia, canales: Canal[], comp: Competencia): string {
  const reglas = exp.reglas_medidas.map(r => `- ${r}`).join('\n');
  const rangos = Object.entries(exp.rangos).filter(([k]) => canales.includes(k as Canal))
    .map(([k, v]) => `${k}: ${v[0]}–${v[1]} caracteres`).join(', ');
  const ejemplosFijos = exp.ejemplos.map(x => `- ${x}`).join('\n');
  const ejemplosVivos = comp.ejemplos.length
    ? `\n\nLO QUE ESTÁ ENTRANDO EN DISCOVER ESTA SEMANA EN ESTE VERTICAL (titulares reales de otros medios, ordenados por tracción; imita la construcción, nunca el contenido)\n${comp.ejemplos.map(x => `- ${x}`).join('\n')}`
    : '';
  const formulas = comp.formulas.length
    ? `\n\nFÓRMULAS DOMINANTES ESTA SEMANA (n-gramas más repetidos en los titulares que entran): ${comp.formulas.join(' · ')}. Úsalas como pista de qué está funcionando, no las copies literalmente; si una está muy quemada, dilo en descartes.`
    : '';
  const patrones = comp.patrones.length
    ? `\n\nPATRONES HISTÓRICOS DEL VERTICAL (un mes de Discover: fórmulas, verbos y entidades que más se repiten por categoría y por medio)\n${comp.patrones.map(x => `- ${x}`).join('\n')}`
    : '';
  const plantillas = comp.plantillas.length
    ? `\n\nPLANTILLAS EDITORIALES QUE HAN FUNCIONADO (estructuras ganadoras; {entity} es la entidad de la pieza; adáptalas al material, no las rellenes mecánicamente)\n${comp.plantillas.map(x => `- ${x}`).join('\n')}`
    : '';

  return `Eres editor jefe de una redacción digital española. Un redactor te pasa un titular (y a veces el texto de la pieza) y tú le devuelves alternativas mejores, explicando por qué. Escribes en castellano.

REGLAS QUE NO SE NEGOCIAN
1. Veracidad: no puedes escribir ningún nombre, cifra, cita, fecha ni dato que no esté en el titular original o en el texto que te pasan. Si no está, no existe. No completes con lo que sepas del tema.
2. Trazabilidad: en cada propuesta, "fuente" es la frase LITERAL del texto (o del titular original) en la que te apoyas, copiada tal cual, sin comillas añadidas, sin reescribir ni resumir.
3. Toda cita entre comillas se copia PALABRA POR PALABRA del texto: puedes recortarla por el final, nunca reformularla ni resumirla. Una cita que no esté tal cual en el texto es una falsedad atribuida a una persona. Si el texto no trae declaraciones, no inventes una: usa otra estructura y dilo en "descartes". Usa comillas latinas «» para las citas.
4. Una palanca dominante por titular. Dos mecanismos en la misma frase se anulan.
5. El titular abre, no cierra: no resuelvas del todo la incógnita. Excepción: el canal search, que sí resuelve la búsqueda con la entidad al principio.
6. Cada propuesta entra por un ángulo distinto (informativo, contraste, consecuencia, cita, autoridad, detalle, identificación…). No son sinónimos del mismo enfoque.
7. Prohibido: ${LISTA_NEGRA.slice(0, 10).join(', ')}; superlativos; urgencia fabricada; escándalo inflado; pregunta retórica; puntos suspensivos; más de una señal de clickbait.
8. Respeta la entidad tal como viene escrita (marca, modelo, nombre, cargo).

PALANCAS DE ATENCIÓN (elige UNA dominante por titular)
${PALANCAS}

LA EXPERIENCIA MEDIDA — ${exp.nombre}
Esto no es opinión: está medido en Search Console. Úsalo para decidir estructura, longitud y apertura.
${reglas}

RANGOS DE LONGITUD POR CANAL (medidos): ${rangos}

CONSTRUCCIONES QUE FUNCIONAN (respaldo; imita el registro y la construcción, nunca el contenido ni los nombres)
${ejemplosFijos}${ejemplosVivos}${formulas}${patrones}${plantillas}

QUÉ DEVUELVES (solo JSON válido, sin texto alrededor ni bloques de código)
{
  "analisis_original": { "palanca": "…", "estructura": "…", "tiempo_verbal": "…", "diagnostico": "dos frases con lo que le falta según la experiencia medida", "que_conserva": "qué tiene de bueno y hay que mantener" },
  "propuestas": [ { "texto": "…", "canal": "${canales.join('|')}", "angulo": "…", "palanca": "…", "estructura": "por ejemplo: Nombre, cargo: «cita» / Consecuencia con fecha / Entidad + dato concreto / Contraste esperado-real", "tiempo_verbal": "presente | pasado narrativo | futuro | sin verbo", "fuente": "frase literal", "por_que": "una o dos frases que citen la regla medida o el titular de la competencia en que te apoyas" } ],
  "descartes": [ "ángulos considerados y por qué no valen con este material" ]
}
${canales.length === 1 && canales[0] === 'discover'
    ? `CINCO propuestas, todas para el canal discover, cada una por un ángulo y una palanca distintos: si el texto trae declaraciones, una con la estructura «Nombre, cargo: «cita»»; una de consecuencia para el lector con cifra ancla; una de contraste o detalle revelador; una de autoridad o identificación; y una quinta por el ángulo que mejor case con el material. Todas entre ${exp.rangos.discover[0]} y ${exp.rangos.discover[1]} caracteres (cuenta los caracteres antes de devolverla: si se queda corta, añade el dato concreto que falta, no relleno), con la entidad en las cinco primeras palabras y abriendo la incógnita sin cerrarla.`
    : `Una propuesta por canal pedido (${canales.join(', ')}) y hasta seis en total.`}`;
}

function userPrompt(titular: string, texto: string, canales: Canal[]): string {
  const partes = [`TITULAR DEL REDACTOR:\n${titular}`];
  partes.push(texto.trim()
    ? `TEXTO DE LA PIEZA:\n${texto.trim().slice(0, 6000)}`
    : 'TEXTO DE LA PIEZA: no se ha pasado. Solo puedes usar lo que dice el titular; no añadas datos.');
  partes.push(`CANALES: ${canales.join(', ')}`);
  return partes.join('\n\n');
}

// ---------------------------------------------------------------- modelo

const ESQUEMA = {
  type: 'object',
  properties: {
    analisis_original: {
      type: 'object',
      properties: { palanca: { type: 'string' }, estructura: { type: 'string' }, tiempo_verbal: { type: 'string' }, diagnostico: { type: 'string' }, que_conserva: { type: 'string' } },
      required: ['palanca', 'estructura', 'tiempo_verbal', 'diagnostico', 'que_conserva'],
    },
    propuestas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          texto: { type: 'string' }, canal: { type: 'string', enum: ['discover', 'search', 'portada', 'redes'] },
          angulo: { type: 'string' }, palanca: { type: 'string' }, estructura: { type: 'string' },
          tiempo_verbal: { type: 'string' }, fuente: { type: 'string' }, por_que: { type: 'string' },
        },
        required: ['texto', 'canal', 'angulo', 'palanca', 'estructura', 'tiempo_verbal', 'fuente', 'por_que'],
      },
    },
    descartes: { type: 'array', items: { type: 'string' } },
  },
  required: ['analisis_original', 'propuestas', 'descartes'],
};

/** Por defecto, modelo local (Ollama) a través del túnel publicado en Redis. Claude solo si se pide. */
function backend(): 'claude' | 'ollama' {
  return (process.env.TITULARES_BACKEND || '').toLowerCase() === 'claude' ? 'claude' : 'ollama';
}

interface TunelOllama { url: string; token?: string; modelo?: string; ts: number }

const CLAVE_TUNEL = 'da:titulares:ollama';
const TUNEL_MAX_EDAD_MS = 3 * 60_000;

/** URL del modelo local: OLLAMA_URL fijo, o el túnel que publica el Mac en Redis (con latido). */
async function resolverOllama(): Promise<TunelOllama> {
  if (process.env.OLLAMA_URL) return { url: process.env.OLLAMA_URL, token: process.env.OLLAMA_TOKEN, ts: Date.now() };
  // TITULARES_REDIS_* permite que varias instancias lean el mismo punto de encuentro
  // (el Mac publica en un solo Redis); si no está, se usa el Redis de la instancia.
  const url = process.env.TITULARES_REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.TITULARES_REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    const r = new Redis({ url, token });
    const t = await r.get<TunelOllama>(CLAVE_TUNEL);
    if (t?.url && Date.now() - (t.ts || 0) < TUNEL_MAX_EDAD_MS) return t;
    if (t?.url) throw new Error(`El modelo local no responde: el último latido del túnel fue hace ${Math.round((Date.now() - t.ts) / 60000)} min. ¿Está encendido el Mac y corriendo el túnel?`);
  }
  if (process.env.VERCEL) throw new Error('No hay modelo local publicado: arranca el túnel en el Mac (titulares-tunel) o define OLLAMA_URL en Vercel.');
  return { url: 'http://localhost:11434', ts: Date.now() };
}

export function nombreModelo(): string {
  return backend() === 'claude'
    ? (process.env.TITULARES_MODEL || 'claude-opus-5')
    : (process.env.OLLAMA_MODEL || 'qwen3:14b');
}

function parseJson(raw: string): any {
  let s = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a > 0 || b < s.length - 1) s = s.slice(a, b + 1);
  return JSON.parse(s);
}

async function llamarClaude(system: string, user: string): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Falta ANTHROPIC_API_KEY (o pon TITULARES_BACKEND=ollama)');
  // Una clave sin workspace exige indicar el workspace en cada petición.
  const workspace = process.env.ANTHROPIC_WORKSPACE_ID;
  const client = new Anthropic({ apiKey, ...(workspace ? { defaultHeaders: { 'anthropic-workspace-id': workspace } } : {}) });
  // El system (reglas, palancas, experiencia, competencia) es el mismo para todas las
  // peticiones de la semana: se cachea y las siguientes pagan una décima parte de esa entrada.
  // Tarea corta y con reglas cerradas: esfuerzo bajo. max_tokens holgado para que el
  // razonamiento adaptativo no se coma el presupuesto y deje la respuesta vacía.
  const res = await client.messages.create({
    model: nombreModelo(),
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low' },
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
  });
  if (res.stop_reason === 'refusal') throw new Error('El modelo ha rechazado la petición');
  const text = res.content.filter(b => b.type === 'text').map(b => (b as { type: 'text'; text: string }).text).join('\n');
  if (!text.trim()) throw new Error(`El modelo no devolvió texto (stop_reason ${res.stop_reason}, bloques ${res.content.map(b => b.type).join(',') || 'ninguno'})`);
  return parseJson(text);
}

async function llamarOllama(system: string, user: string): Promise<any> {
  const tunel = await resolverOllama();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (tunel.token) headers['Authorization'] = `Bearer ${tunel.token}`;
  // stream:true para que el túnel reciba bytes de forma continua (Cloudflare corta
  // las respuestas sin tráfico a los 100 s, y el modelo local tarda más).
  const r = await fetch(`${tunel.url.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: tunel.modelo || nombreModelo(),
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      stream: true, format: ESQUEMA, think: false,
      options: { temperature: 0.7, num_ctx: 12000, num_predict: 1800 },
    }),
  });
  if (!r.ok || !r.body) throw new Error(`Modelo local ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = '', contenido = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const linea = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
      if (!linea) continue;
      try {
        const j = JSON.parse(linea);
        if (j.error) throw new Error(`Modelo local: ${j.error}`);
        contenido += j.message?.content || '';
      } catch (e: any) { if (String(e?.message || '').startsWith('Modelo local')) throw e; }
    }
  }
  if (buf.trim()) { try { contenido += JSON.parse(buf).message?.content || ''; } catch { /* resto vacío */ } }
  return parseJson(contenido);
}

// ---------------------------------------------------------------- validador

export function medir(texto: string): Medidas {
  const t = texto.trim();
  const primera = t.split(/\s+/)[0] || '';
  let abre: Medidas['abre_por'] = 'otro';
  if (/^[«"“‘']/.test(primera)) abre = 'comillas';
  else if (/^\d/.test(primera)) abre = 'número';
  else if (/^(el|la|los|las|un|una|unos|unas)$/i.test(primera)) abre = 'artículo';
  else if (/^[A-ZÁÉÍÓÚÑ]/.test(primera)) abre = 'nombre propio';
  return {
    caracteres: t.length,
    palabras: t.split(/\s+/).filter(Boolean).length,
    cita: /[«"“]/.test(t),
    cifra: /\d/.test(t),
    dos_puntos: t.includes(':'),
    nombre_cargo_cita: /^[^:«"“]{3,60}(,\s[^:]{3,80})?:\s*[«"“]/.test(t),
    abre_por: abre,
  };
}

function norm(x: string): string {
  return x.trim().replace(/^['"«»“”‘’\s]+|['"«»“”‘’\s]+$/g, '').toLowerCase()
    .replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ');
}

function esta(frag: string, texto: string): boolean {
  const f = norm(frag), tf = norm(texto);
  if (f.length < 25) return tf.includes(f);
  for (let i = 0; i + 25 <= f.length; i += 8) if (tf.includes(f.slice(i, i + 25))) return true;
  return false;
}

export function validar(p: Propuesta, rangos: Record<string, [number, number]>, textoFuente: string, aperturas: Set<string>): Validacion {
  const bloquea: string[] = [], avisa: string[] = [];
  const t = p.texto.trim();
  const [lo, hi] = rangos[p.canal] || [0, 999];
  if (t.length < lo) avisa.push(`corto: ${t.length} caracteres, rango ${p.canal} ${lo}–${hi}`);
  if (t.length > hi + 15) avisa.push(`largo: ${t.length} caracteres, rango ${p.canal} ${lo}–${hi}`);
  const senales = CLICKBAIT.filter(([rx]) => rx.test(t)).map(([, n]) => n);
  if (senales.length >= 2) bloquea.push('clickbait: ' + senales.join(', '));
  else if (senales.length === 1) avisa.push('una señal de clickbait: ' + senales[0]);
  const tl = t.toLowerCase();
  const negras = LISTA_NEGRA.filter(x => tl.includes(x));
  if (negras.length) bloquea.push('lista negra: ' + negras.join(', '));
  if (textoFuente) {
    if (p.fuente && !esta(p.fuente, textoFuente)) bloquea.push('la fuente no aparece literalmente en el texto');
    for (const m of t.matchAll(/[«"“‘']([^»"”’']{12,})[»"”’']/g)) {
      if (!esta(m[1], textoFuente)) bloquea.push('cita no literal: «' + m[1].slice(0, 50) + '…»');
    }
    const sinPuntos = textoFuente.replace(/\./g, '');
    for (const m of t.matchAll(/\d[\d.,]*/g)) {
      if (!textoFuente.includes(m[0]) && !sinPuntos.includes(m[0].replace(/\./g, ''))) bloquea.push(`cifra ${m[0]} no está en el texto`);
    }
  }
  const ap = tl.split(/\s+/).slice(0, 2).join(' ');
  if (aperturas.has(ap)) avisa.push(`repite apertura «${ap}» con otra propuesta`);
  aperturas.add(ap);
  return { estado: bloquea.length ? 'FALLA' : avisa.length ? 'AVISO' : 'PASA', bloquea, avisa };
}

// ---------------------------------------------------------------- entrada

export async function generarTitulares(input: { titular: string; texto?: string; canales?: string[]; perfil?: string }): Promise<RespuestaTitulares> {
  const titular = (input.titular || '').trim();
  if (!titular) throw new Error('Falta el titular');
  const texto = input.texto || '';
  const canales = ((input.canales && input.canales.length ? input.canales : ['discover']) as Canal[])
    .filter(c => ['discover', 'search', 'portada', 'redes'].includes(c));
  const exps = cargarExperiencia();
  const perfil = input.perfil && exps[input.perfil] ? input.perfil : perfilInstancia();
  const exp = exps[perfil];
  const comp = competenciaDesdeEstado(perfil);

  const t0 = Date.now();
  const system = systemPrompt(exp, canales, comp);
  const user = userPrompt(titular, texto, canales);
  const salida = backend() === 'claude' ? await llamarClaude(system, user) : await llamarOllama(system, user);
  const segundos = Math.round((Date.now() - t0) / 100) / 10;

  const aperturas = new Set<string>();
  const propuestas: Propuesta[] = (salida.propuestas || []).map((p: Propuesta) => {
    const q: Propuesta = { ...p, texto: String(p.texto || '').trim() };
    q.medidas = medir(q.texto);
    q.validador = validar(q, exp.rangos, texto || titular, aperturas);
    return q;
  });
  const orden = { PASA: 0, AVISO: 1, FALLA: 2 };
  propuestas.sort((a, b) => orden[a.validador!.estado] - orden[b.validador!.estado]);

  return {
    original: { texto: titular, medidas: medir(titular), analisis: salida.analisis_original || {} },
    propuestas,
    descartes: salida.descartes || [],
    experiencia: exp.nombre,
    rangos: exp.rangos,
    competencia: { ejemplos: comp.ejemplos.length, formulas: comp.formulas, patrones: comp.patrones.length, plantillas: comp.plantillas.length, ventana_dias: 7 },
    modelo: nombreModelo(),
    segundos,
  };
}
