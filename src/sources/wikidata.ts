/**
 * Wikidata enrichment para entidades trending.
 *
 * Razón: el research 1492.vision sobre "Entities Everywhere · Knowledge Graph"
 * confirma que Discover usa entidades del KG con sus atributos (tipo,
 * sameAs, alias) para clasificar y rankear contenido. Si nuestras entidades
 * no tienen huella KG, perdemos visibilidad sobre cómo Discover las "ve".
 *
 * Este módulo cruza nombres de entidades DS contra Wikidata y devuelve:
 *  - wdId   (Q1234)
 *  - type   (Person/Org/Place/Event/Other) inferido de instance_of (P31)
 *  - wikipediaEs / wikipediaEn (URLs)
 *  - aliases (otros nombres conocidos)
 *  - description (1 frase corta de Wikidata)
 *
 * Sin API key. Rate limit: ~50 req/s — usamos límite conservador con throttle.
 */

export interface KgEnrichment {
  name: string;
  wdId?: string;
  type?: 'Person' | 'Organization' | 'Place' | 'Event' | 'Work' | 'Other';
  description?: string;
  wikipediaEs?: string;
  wikipediaEn?: string;
  aliases?: string[];
  resolvedAt: string;
  /** Si la búsqueda no devolvió match razonable. */
  notFound?: boolean;
}

// Mapping rough de Wikidata "instance of" (P31) o subclasses a tipo simple.
// Prefijos Q comunes para personas/lugares/orgs/eventos. Nota: Wikidata es
// gigantesco, esto es heurístico — solo cubrimos los más frecuentes en news.
const PERSON_QIDS = new Set(['Q5', 'Q215627']); // human, person
const ORG_QIDS = new Set([
  'Q43229', 'Q4830453', 'Q783794', 'Q484652', 'Q15265344', // organization, business, company, NGO, broadcaster
  'Q7278', 'Q11032', 'Q56061', 'Q27686', 'Q1469848', // political party, newspaper, admin entity, intl org, ministry
  'Q476028', 'Q12973014', // football club, sports club
]);
const PLACE_QIDS = new Set([
  'Q515', 'Q486972', 'Q3957', 'Q5119', 'Q56061', // city, settlement, town, capital, admin entity
  'Q6256', 'Q5107', // country, continent
  'Q17350442', 'Q22865', // venue, region
]);
const EVENT_QIDS = new Set([
  'Q1190554', 'Q1656682', 'Q132241', // event, occurrence, festival
  'Q11514315', 'Q2627975', // historical event, championship
  'Q500834', 'Q189760', // tournament, war
]);
const WORK_QIDS = new Set([
  'Q11424', 'Q5398426', 'Q571', 'Q482994', // film, TV series, book, album
  'Q7889', 'Q15709879', // video game, drama TV series
]);

function classifyType(p31s: string[]): KgEnrichment['type'] {
  for (const q of p31s) {
    if (PERSON_QIDS.has(q)) return 'Person';
    if (ORG_QIDS.has(q)) return 'Organization';
    if (PLACE_QIDS.has(q)) return 'Place';
    if (EVENT_QIDS.has(q)) return 'Event';
    if (WORK_QIDS.has(q)) return 'Work';
  }
  return 'Other';
}

const UA = 'discover-alerts-wikidata-bot/1.0 (https://discover-alerts.vercel.app)';

async function fetchJson(url: string, ms = 8000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': UA, 'accept': 'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

/** Busca el QID más probable para un nombre dado. */
async function searchQid(name: string): Promise<string | null> {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=es&uselang=es&format=json&limit=1&origin=*`;
  try {
    const j = await fetchJson(url);
    const hit = j?.search?.[0];
    return hit?.id || null;
  } catch { return null; }
}

/** Recupera atributos clave de un QID. */
async function fetchEntity(qid: string): Promise<KgEnrichment | null> {
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
  try {
    const j = await fetchJson(url);
    const e = j?.entities?.[qid];
    if (!e) return null;
    const labels = e.labels || {};
    const descs = e.descriptions || {};
    const aliases = e.aliases?.es || [];
    const sitelinks = e.sitelinks || {};
    // P31 instance of
    const p31Claims = e.claims?.P31 || [];
    const p31s = p31Claims.map((c: any) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
    return {
      name: labels.es?.value || labels.en?.value || qid,
      wdId: qid,
      type: classifyType(p31s),
      description: descs.es?.value || descs.en?.value,
      wikipediaEs: sitelinks.eswiki ? `https://es.wikipedia.org/wiki/${encodeURIComponent(sitelinks.eswiki.title.replace(/ /g, '_'))}` : undefined,
      wikipediaEn: sitelinks.enwiki ? `https://en.wikipedia.org/wiki/${encodeURIComponent(sitelinks.enwiki.title.replace(/ /g, '_'))}` : undefined,
      aliases: aliases.slice(0, 5).map((a: any) => a.value).filter(Boolean),
      resolvedAt: new Date().toISOString(),
    };
  } catch { return null; }
}

/** Enrichment de UNA entidad. Devuelve null si no hay match razonable. */
export async function enrichEntity(name: string): Promise<KgEnrichment | null> {
  if (!name || name.length < 3) return null;
  const qid = await searchQid(name);
  if (!qid) return { name, resolvedAt: new Date().toISOString(), notFound: true };
  const enr = await fetchEntity(qid);
  if (!enr) return { name, resolvedAt: new Date().toISOString(), notFound: true };
  return enr;
}

/**
 * Enrichment batch con throttle (10 req/s para no abusar de la API gratuita).
 * Cache existente en `prev` se respeta — solo enriquecemos las nuevas.
 */
export async function enrichBatch(
  names: string[],
  prev: Record<string, KgEnrichment> = {},
  maxToFetch = 60,
): Promise<Record<string, KgEnrichment>> {
  const out = { ...prev };
  const toFetch = names
    .filter(n => n && n.length >= 3 && !out[n])
    .slice(0, maxToFetch);
  for (const name of toFetch) {
    const enr = await enrichEntity(name);
    if (enr) out[name] = enr;
    // Throttle 100ms entre requests = ~10 req/s
    await new Promise(r => setTimeout(r, 100));
  }
  return out;
}
