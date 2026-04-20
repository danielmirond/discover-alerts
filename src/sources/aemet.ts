/**
 * AEMET avisos (sin API key) — scrapea el HTML público de
 * https://www.aemet.es/es/eltiempo/prediccion/avisos.
 *
 * Si hay API key (AEMET_API_KEY), sería preferible usar OpenData — pendiente.
 * Este parser es un MVP frágil: extrae texto de los bloques con clase
 * `avisos-` (amarillo/naranja/rojo) con título y CCAA afectadas. Si AEMET
 * cambia el markup, romperá; revisar cada trimestre.
 */

export interface AemetAviso {
  level: 'amarillo' | 'naranja' | 'rojo' | 'desconocido';
  region: string;
  phenomenon: string;
  validFrom?: string;
  validTo?: string;
  raw: string;
}

const URL_AEMET = 'https://www.aemet.es/es/eltiempo/prediccion/avisos';

async function fetchHtml(): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15_000);
  const r = await fetch(URL_AEMET, {
    signal: ctrl.signal,
    redirect: 'follow',
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; discover-alerts-aemet)' },
  });
  clearTimeout(t);
  if (!r.ok) throw new Error(`AEMET HTTP ${r.status}`);
  return r.text();
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function detectLevel(text: string, html: string): AemetAviso['level'] {
  const lower = (text + ' ' + html).toLowerCase();
  if (lower.includes('nivel rojo') || /\brojo\b/i.test(text)) return 'rojo';
  if (lower.includes('naranja')) return 'naranja';
  if (lower.includes('amarillo')) return 'amarillo';
  return 'desconocido';
}

export async function fetchAemetAvisos(): Promise<AemetAviso[]> {
  const html = await fetchHtml();
  const out: AemetAviso[] = [];

  // Estrategia: los avisos vienen como items en <li> con texto tipo
  // "Lluvias nivel amarillo en Andalucía · hoy · hasta 20:00".
  // Intentamos extraer todos los <li> que mencionen una CCAA reconocida.
  const CCAAS = [
    'andalucía','andalucia','aragón','aragon','asturias','baleares','canarias',
    'cantabria','castilla y león','castilla y leon','castilla-la mancha',
    'cataluña','cataluna','catalunya','comunidad valenciana','extremadura',
    'galicia','madrid','murcia','navarra','país vasco','pais vasco',
    'euskadi','la rioja','ceuta','melilla',
  ];

  // Capturar cada <li>...</li>
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/g;
  let m: RegExpExecArray | null;
  while ((m = liRe.exec(html))) {
    const inner = m[1];
    const text = stripTags(inner);
    if (text.length < 20 || text.length > 300) continue;
    const lower = text.toLowerCase();
    const region = CCAAS.find(c => lower.includes(c));
    if (!region) continue;
    const levelMatch = /(amarillo|naranja|rojo)/i.exec(text);
    if (!levelMatch) continue;
    const level = levelMatch[1].toLowerCase() as AemetAviso['level'];
    // phenomenon = texto antes del nivel
    const phenomenon = text.slice(0, text.toLowerCase().indexOf(levelMatch[1].toLowerCase())).trim() || 'aviso';

    out.push({
      level,
      region,
      phenomenon,
      raw: text,
    });
  }

  // Dedupe por (level+region+phenomenon)
  const seen = new Set<string>();
  const dedup: AemetAviso[] = [];
  for (const a of out) {
    const k = `${a.level}|${a.region}|${a.phenomenon.toLowerCase()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    dedup.push(a);
  }
  return dedup.slice(0, 100);
}
