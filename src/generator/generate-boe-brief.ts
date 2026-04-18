import { fetchBoeSumario } from '../sources/boe.js';
import type { BoeItem } from '../types.js';
import { callLlm, getModelName } from './llm.js';
import { EDITORIAL_GUIDELINES } from './prompts.js';
import { slugify } from './slugify.js';
import { writeBoeBrief } from './storage.js';

export interface GeneratedArticle {
  title: string;
  description: string;
  painCategory: string;
  painHook: string;
  tags: string[];
  body: string;
}

function parseJson(raw: string): GeneratedArticle {
  // El modelo a veces envuelve en ```json```
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned) as GeneratedArticle;
}

function formatBoeDate(dateStr: string): string {
  // YYYYMMDD -> YYYY-MM-DD
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

function todayYYYYMMDD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function itemsToPrompt(items: BoeItem[]): string {
  // Agrupamos por seccion para que el LLM entienda la estructura
  const bySection = new Map<string, BoeItem[]>();
  for (const item of items) {
    const key = item.seccion || 'Sin seccion';
    const arr = bySection.get(key) ?? [];
    arr.push(item);
    bySection.set(key, arr);
  }

  const lines: string[] = [];
  for (const [seccion, secItems] of bySection) {
    lines.push(`\n## ${seccion}\n`);
    for (const item of secItems.slice(0, 40)) {
      // limite por seccion para no saturar el context
      lines.push(
        `- [${item.identificador}] (${item.departamento}) ${item.titulo}`,
      );
    }
    if (secItems.length > 40) {
      lines.push(`...y ${secItems.length - 40} items mas en esta seccion.`);
    }
  }
  return lines.join('\n');
}

export async function generateBoeBrief(
  dateYYYYMMDD?: string,
): Promise<{ filepath: string; slug: string; title: string } | null> {
  const dateStr = dateYYYYMMDD ?? todayYYYYMMDD();
  console.log(`[brief] Generando resumen BOE para ${dateStr}...`);

  const items = await fetchBoeSumario(dateStr);
  if (items.length === 0) {
    console.log(`[brief] Sin items (dia sin publicacion).`);
    return null;
  }
  console.log(`[brief] ${items.length} items obtenidos del BOE.`);

  const userPrompt = `Te paso el sumario completo del BOE del dia ${formatBoeDate(dateStr)}.

Tu trabajo es escribir UN SOLO articulo de resumen ejecutivo que haga
que un lector medio entienda en 3 minutos lo mas importante que le
afecta HOY. Identifica entre 3 y 6 disposiciones con impacto
ciudadano real (las que tocan los dolores del framework editorial) y
construye el articulo alrededor de esas.

Ignora las disposiciones puramente tecnicas o administrativas sin
impacto ciudadano (ej: cambios de rango funcionarial internos,
nombramientos sin relevancia publica, anuncios de contratacion
rutinarios).

El titular debe seguir uno de los patrones A-F que tienes en las
directrices. La bajada debe responder "a quien afecta exactamente".

SUMARIO COMPLETO DEL BOE:
${itemsToPrompt(items)}

Devuelve SOLO el JSON segun el esquema especificado.`;

  const raw = await callLlm({
    system: EDITORIAL_GUIDELINES,
    user: userPrompt,
    maxTokens: 3500,
    temperature: 0.4,
  });

  const generated = parseJson(raw);

  // Top items mas relevantes como "sources" visibles
  const topSources = items.slice(0, 10).map(item => ({
    identificador: item.identificador,
    titulo: item.titulo,
    url:
      item.urlPdf ||
      item.urlHtml ||
      `https://www.boe.es/diario_boe/txt.php?id=${item.identificador}`,
    departamento: item.departamento,
    seccion: item.seccion,
  }));

  const boeDate = formatBoeDate(dateStr);
  const slug = `resumen-boe-${boeDate}`;

  const filepath = await writeBoeBrief({
    boeDate,
    frontmatter: {
      type: 'boe-brief',
      slug,
      title: generated.title,
      description: generated.description,
      date: new Date().toISOString(),
      author: 'redaccion-radar-boe',
      pain: generated.painCategory,
      painHook: generated.painHook,
      tags: generated.tags,
      sources: topSources,
      aiGenerated: true,
      aiModel: getModelName(),
      boeDate,
      itemsCount: items.length,
    },
    body: generated.body,
  });

  console.log(`[brief] Escrito en ${filepath}`);
  return { filepath, slug, title: generated.title };
}
