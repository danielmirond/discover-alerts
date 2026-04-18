import { fetchBoeSumario } from '../sources/boe.js';
import { fetchGoogleTrends } from '../sources/google-trends.js';
import type { BoeItem } from '../types.js';
import { callLlm, getModelName } from './llm.js';
import { EDITORIAL_GUIDELINES } from './prompts.js';
import { slugify } from './slugify.js';
import { writeNoticia } from './storage.js';

interface GeneratedArticle {
  title: string;
  description: string;
  painCategory: string;
  painHook: string;
  tags: string[];
  body: string;
}

function parseJson(raw: string): GeneratedArticle {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned) as GeneratedArticle;
}

function todayYYYYMMDD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

// Seleccionamos los items del BOE con mayor potencial Discover:
// los que tocan dolores concretos (por palabras clave en el titulo)
const PAIN_KEYWORDS = [
  'nomina', 'deduccion', 'irpf', 'impuesto', 'bonificacion',
  'salario', 'cotizacion', 'seguridad social',
  'festivo', 'puente', 'calendario', 'laboral', 'jornada',
  'pension', 'jubilacion', 'subsidio', 'ayuda',
  'precio', 'tarifa', 'luz', 'gas', 'butano', 'tabaco', 'gasolina',
  'vivienda', 'alquiler', 'comunidad', 'propiedad',
  'carnet', 'dgt', 'trafico', 'vehiculo', 'electrico',
  'oposicion', 'plazas', 'empleo publico',
  'prohibido', 'prohibicion', 'obligatorio', 'obligacion',
  'multa', 'sancion',
];

function rankItemsForDiscover(items: BoeItem[]): BoeItem[] {
  const scored = items.map(item => {
    const t = (item.titulo || '').toLowerCase();
    let score = 0;
    for (const kw of PAIN_KEYWORDS) {
      if (t.includes(kw)) score += 2;
    }
    // Bonus para disposiciones generales (mas rango que anuncios)
    if (item.seccion?.toLowerCase().includes('disposiciones generales')) {
      score += 3;
    }
    // Penaliza sección de anuncios puros y justicia
    if (
      item.seccion?.toLowerCase().includes('anuncios') ||
      item.seccion?.toLowerCase().includes('justicia')
    ) {
      score -= 2;
    }
    return { item, score };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(s => s.item);
}

export async function generateNoticiasDiscover(
  count = 3,
): Promise<Array<{ filepath: string; slug: string; title: string }>> {
  console.log(`[trending] Generando ${count} noticias Discover...`);

  const [boeItems, trends] = await Promise.all([
    fetchBoeSumario(todayYYYYMMDD()),
    fetchGoogleTrends().catch(() => []),
  ]);

  if (boeItems.length === 0) {
    console.log('[trending] No hay publicacion BOE hoy, saltando.');
    return [];
  }

  const ranked = rankItemsForDiscover(boeItems);
  const top = ranked.slice(0, count);
  console.log(
    `[trending] ${ranked.length} items con potencial Discover; seleccionados top ${top.length}.`,
  );

  const trendsContext =
    trends.length > 0
      ? `\n\nTENDENCIAS EN ESPANA AHORA MISMO (para contextualizar):
${trends.slice(0, 20).map(t => `- ${t.title} (${t.approxTraffic.toLocaleString()}+ busquedas)`).join('\n')}`
      : '';

  const results: Array<{ filepath: string; slug: string; title: string }> = [];

  for (const item of top) {
    try {
      const itemContext = `DISPOSICION CONCRETA DEL BOE A COBERTURAR:
- Identificador: ${item.identificador}
- Titulo oficial: ${item.titulo}
- Seccion: ${item.seccion}
- Departamento: ${item.departamento}
- URL PDF: ${item.urlPdf}
- URL HTML: ${item.urlHtml}${trendsContext}`;

      const userPrompt = `${itemContext}

Tu trabajo: escribe UNA noticia individual sobre esta disposicion
concreta del BOE, siguiendo estrictamente las directrices editoriales.

Pasos obligatorios ANTES de escribir:
1. Identifica el dolor del lector que toca (del framework).
2. Si no toca ningun dolor, devuelve un JSON con title="SKIP" y el
   resto de campos vacios (un campo "body" vacio). Ese articulo no
   se publicara.
3. Si si toca un dolor, elige el patron de titular mas adecuado
   (A-F) y construye el articulo.

Devuelve SOLO el JSON.`;

      const raw = await callLlm({
        system: EDITORIAL_GUIDELINES,
        user: userPrompt,
        maxTokens: 2500,
        temperature: 0.5,
      });

      const generated = parseJson(raw);

      if (generated.title === 'SKIP' || !generated.body) {
        console.log(`[trending] Skip: ${item.identificador} (sin dolor claro)`);
        continue;
      }

      const slug = slugify(generated.title);
      const filepath = await writeNoticia({
        slug,
        frontmatter: {
          type: 'noticia',
          slug,
          title: generated.title,
          description: generated.description,
          date: new Date().toISOString(),
          author: 'redaccion-radar-boe',
          pain: generated.painCategory,
          painHook: generated.painHook,
          tags: generated.tags,
          sources: [
            {
              identificador: item.identificador,
              titulo: item.titulo,
              url:
                item.urlPdf ||
                item.urlHtml ||
                `https://www.boe.es/diario_boe/txt.php?id=${item.identificador}`,
              departamento: item.departamento,
              seccion: item.seccion,
            },
          ],
          aiGenerated: true,
          aiModel: getModelName(),
        },
        body: generated.body,
      });

      console.log(`[trending] Escrito: ${slug}`);
      results.push({ filepath, slug, title: generated.title });
    } catch (err) {
      console.error(`[trending] Error con ${item.identificador}:`, err);
    }
  }

  return results;
}
