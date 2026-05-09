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

// Mapping de Wikidata "instance of" (P31) a tipo simple. Lista ampliada
// cubriendo los QIDs más frecuentes en news ES.
const PERSON_QIDS = new Set([
  'Q5', 'Q215627', 'Q24229398', 'Q95074', // human, person, agent, fictional character
  'Q937857', 'Q2066131', 'Q1028181', // football player, sportsperson, painter
  'Q82955', 'Q189290', 'Q484876', 'Q2526255', // politician, military officer, executive, athlete
  'Q33999', 'Q177220', 'Q10800557', 'Q49757', 'Q1622272', // actor, singer, film actor, poet, university teacher
  'Q14467526', 'Q43845', 'Q170790', // sportsperson, journalist, businessperson
]);
const ORG_QIDS = new Set([
  'Q43229', 'Q4830453', 'Q783794', 'Q484652', 'Q15265344', // organization, business, company, NGO, broadcaster
  'Q7278', 'Q11032', 'Q56061', 'Q27686', 'Q1469848', // political party, newspaper, admin entity, intl org, ministry
  'Q476028', 'Q12973014', 'Q847017', 'Q35536', // football club, sports club, sports team, basketball team
  'Q4438121', 'Q161726', 'Q1248784', 'Q207320', // sports league, multinational corp, airline, govt agency
  'Q3918', 'Q875538', 'Q3914', 'Q9842', // university, public university, school, primary school
  'Q1322005', 'Q41710', 'Q24650', 'Q1071027', // bank, ethnic group, church, charitable org
  'Q1530705', 'Q161091', 'Q486839', 'Q166262', // foundation, manufacturer, league, supranational org
  'Q23958946', 'Q7257717', // financial institution, web service
]);
const PLACE_QIDS = new Set([
  'Q515', 'Q486972', 'Q3957', 'Q5119', 'Q56061', // city, settlement, town, capital, admin entity
  'Q6256', 'Q5107', 'Q1620908', 'Q15284', // country, continent, historical region, municipality
  'Q17350442', 'Q22865', 'Q23397', 'Q3914', // venue, region, lake, school
  'Q4022', 'Q34442', 'Q47053', 'Q41176', // river, road, mountain, building
  'Q23413', 'Q174782', 'Q12280', 'Q39614', // castle, square, bridge, cemetery
  'Q1107656', 'Q484170', 'Q4022', // amusement park, commune of France, river
  'Q484170', 'Q11750716', 'Q35657', // commune, autonomous community, US state
  'Q1549591', 'Q1093829', // big city, city
]);
const EVENT_QIDS = new Set([
  'Q1190554', 'Q1656682', 'Q132241', 'Q189760', // event, occurrence, festival, war
  'Q11514315', 'Q2627975', 'Q500834', 'Q15275719', // historical event, championship, tournament, recurring event
  'Q1656682', 'Q15966540', 'Q175331', 'Q23653', // sports tournament, election, demonstration, terrorist attack
  'Q2425052', 'Q83267', 'Q3001412', 'Q1153607', // crime, disaster, scandal, sports season
  'Q26529', 'Q198', 'Q151885', 'Q40231', // space mission, war, concept, election
  'Q40231', 'Q3024240', 'Q21184583', // historical period, fiscal year, seasonal event
]);
const WORK_QIDS = new Set([
  'Q11424', 'Q5398426', 'Q571', 'Q482994', // film, TV series, book, album
  'Q7889', 'Q15709879', 'Q47461344', // video game, drama TV series, written work
  'Q3331189', 'Q386724', 'Q134556', 'Q188451', // version of work, work, single, music genre
  'Q277759', 'Q838948', 'Q1004', // book series, work of art, comic
  'Q14406742', 'Q24862', 'Q11410', // television film, short film, game
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
