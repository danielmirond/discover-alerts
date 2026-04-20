import { XMLParser } from 'fast-xml-parser';

/**
 * AEMET via MeteoAlarm.org (Atom feed consolidado oficial de la red
 * EUMETNET, que re-publica los avisos AEMET con formato CAP 1.2 estable).
 *
 * Preferido sobre scrapear aemet.es porque:
 *  - AEMET renderiza con JS (SPA), no HTML estático.
 *  - El feed MeteoAlarm es público, gratuito, sin API key.
 *  - Formato CAP estándar: severity, areaDesc, event, expires.
 *
 * Si luego añadimos AEMET_API_KEY con OpenData, migrar a /api/avisos_cap/
 * para tener los avisos 100% AEMET y nada más.
 */

export interface AemetAviso {
  level: 'amarillo' | 'naranja' | 'rojo' | 'desconocido';
  severity: 'Minor' | 'Moderate' | 'Severe' | 'Extreme' | string;
  region: string;
  phenomenon: string;
  title: string;
  effective?: string;
  onset?: string;
  expires?: string;
  url?: string;
  raw: string;
}

const FEED_URL = 'https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-spain';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  processEntities: false,
});

function severityToLevel(sev: string, title: string): AemetAviso['level'] {
  const t = `${sev || ''} ${title || ''}`.toLowerCase();
  // MeteoAlarm map: Minor/Moderate → yellow, Severe → orange, Extreme → red
  if (t.includes('extreme') || t.includes('red')) return 'rojo';
  if (t.includes('severe') || t.includes('orange')) return 'naranja';
  if (t.includes('moderate') || t.includes('minor') || t.includes('yellow')) return 'amarillo';
  return 'desconocido';
}

function cleanPhenomenon(event: string, title: string): string {
  // event suele venir "Moderate thunderstorm warning" → extraer el nombre
  if (event) {
    const m = /(?:minor|moderate|severe|extreme)\s+(.+?)\s+warning/i.exec(event);
    if (m) return m[1];
  }
  if (title) {
    const m = /(yellow|orange|red)\s+(.+?)\s+warning/i.exec(title);
    if (m) return m[2];
  }
  return event || title || 'aviso';
}

export async function fetchAemetAvisos(): Promise<AemetAviso[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15_000);
  const r = await fetch(FEED_URL, {
    signal: ctrl.signal,
    redirect: 'follow',
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; discover-alerts-aemet)' },
  });
  clearTimeout(t);
  if (!r.ok) throw new Error(`MeteoAlarm HTTP ${r.status}`);
  const xml = await r.text();
  const parsed = parser.parse(xml);

  const entries = parsed?.feed?.entry
    ? (Array.isArray(parsed.feed.entry) ? parsed.feed.entry : [parsed.feed.entry])
    : [];

  const out: AemetAviso[] = [];
  for (const e of entries) {
    const title = String(e.title || '');
    const event = String(e['cap:event'] || '');
    const severity = String(e['cap:severity'] || '');
    const areaDesc = String(e['cap:areaDesc'] || '');
    const effective = e['cap:effective'] ? String(e['cap:effective']) : undefined;
    const onset = e['cap:onset'] ? String(e['cap:onset']) : undefined;
    const expires = e['cap:expires'] ? String(e['cap:expires']) : undefined;

    // link alternate (HTML) para el usuario
    let url: string | undefined;
    const links = Array.isArray(e.link) ? e.link : (e.link ? [e.link] : []);
    for (const l of links) {
      if (l['@_hreflang'] === 'en' && l['@_href']) { url = String(l['@_href']); break; }
    }

    out.push({
      level: severityToLevel(severity, title),
      severity,
      region: areaDesc,
      phenomenon: cleanPhenomenon(event, title),
      title,
      effective,
      onset,
      expires,
      url,
      raw: title,
    });
  }

  // Dedupe por (level+region+phenomenon+onset) — evita repetidos si varios geocodes de la misma zona
  const seen = new Set<string>();
  const dedup: AemetAviso[] = [];
  for (const a of out) {
    const k = `${a.level}|${a.region}|${a.phenomenon}|${a.onset || ''}`;
    if (seen.has(k)) continue;
    seen.add(k);
    dedup.push(a);
  }
  // Ordenar: rojos > naranjas > amarillos, luego por expires descending
  const rank = { rojo: 3, naranja: 2, amarillo: 1, desconocido: 0 } as const;
  dedup.sort((a, b) => {
    const d = (rank as any)[b.level] - (rank as any)[a.level];
    if (d !== 0) return d;
    return (b.expires || '').localeCompare(a.expires || '');
  });
  return dedup.slice(0, 200);
}
