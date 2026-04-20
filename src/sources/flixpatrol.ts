/**
 * FlixPatrol Top 10 España — scrapea HTML público.
 * Fuente: https://flixpatrol.com/top10/netflix/spain/today/
 * Refleja Top 10 Netflix ES del día (más fresco que el TSV semanal de Netflix).
 */

export interface FlixPatrolItem {
  rank: number;
  title: string;
  category: 'TV' | 'Movies';
  platform: string;
  country: string;
}

async function fetchPlatform(platform: string, country = 'spain'): Promise<string> {
  const url = `https://flixpatrol.com/top10/${platform}/${country}/today/`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15_000);
  const r = await fetch(url, {
    signal: ctrl.signal,
    redirect: 'follow',
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; discover-alerts-flixpatrol)' },
  });
  clearTimeout(t);
  if (!r.ok) throw new Error(`FlixPatrol ${platform}/${country} HTTP ${r.status}`);
  return r.text();
}

/**
 * Parser v2: FlixPatrol ya no usa <td rank><td title>. Los titles vienen como
 * <a href="/title/…">Titulo</a> dentro de una sección TV Shows o Movies.
 *
 * Estrategia: dividir el HTML en dos regiones (TV Shows / Movies) por los
 * h3 con ese texto, y extraer los primeros 10 <a href="/title/…"> de cada una.
 */
function parseHtml(html: string, platform: string, country: string): FlixPatrolItem[] {
  // Encuentra índices de los headings
  const tvIdx = html.search(/>TV Shows</i);
  const mvIdx = html.search(/>Movies</i);

  const sections: Array<{ start: number; end: number; category: 'TV' | 'Movies' }> = [];
  if (tvIdx < 0 && mvIdx < 0) {
    sections.push({ start: 0, end: html.length, category: 'Movies' });
  } else {
    // Orden natural: la sección que empieza primero acaba donde empieza la siguiente.
    const marks = [
      tvIdx >= 0 ? { idx: tvIdx, cat: 'TV' as const } : null,
      mvIdx >= 0 ? { idx: mvIdx, cat: 'Movies' as const } : null,
    ].filter(Boolean) as Array<{ idx: number; cat: 'TV' | 'Movies' }>;
    marks.sort((a, b) => a.idx - b.idx);
    for (let i = 0; i < marks.length; i++) {
      const start = marks[i].idx;
      const end = i + 1 < marks.length ? marks[i + 1].idx : html.length;
      sections.push({ start, end, category: marks[i].cat });
    }
  }

  const re = /<a[^>]*href="\/title\/[^"]+"[^>]*>([^<]{2,120})<\/a>/g;
  const out: FlixPatrolItem[] = [];
  for (const sec of sections) {
    const region = html.slice(sec.start, sec.end);
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    let rank = 1;
    const seen = new Set<string>();
    while ((m = re.exec(region)) && rank <= 10) {
      const title = m[1].replace(/&amp;/g, '&').trim();
      if (!title || seen.has(title)) continue;
      seen.add(title);
      out.push({ rank, title, category: sec.category, platform, country });
      rank++;
    }
  }
  return out;
}

export async function fetchFlixPatrolNetflixES(): Promise<FlixPatrolItem[]> {
  const html = await fetchPlatform('netflix', 'spain');
  return parseHtml(html, 'netflix', 'spain');
}

/** Matriz platform×country a monitorizar. Mantener corta para no reventar cadencia. */
export const FLIXPATROL_TARGETS: Array<{ platform: string; country: string; label: string }> = [
  { platform: 'netflix',      country: 'spain',         label: 'Netflix ES' },
  { platform: 'amazon-prime', country: 'spain',         label: 'Prime Video ES' },
  { platform: 'disney',       country: 'spain',         label: 'Disney+ ES' },
  { platform: 'hbo-max',      country: 'spain',         label: 'HBO Max ES' },
  { platform: 'netflix',      country: 'world',         label: 'Netflix World' },
  { platform: 'netflix',      country: 'united-states', label: 'Netflix US' },
  { platform: 'netflix',      country: 'united-kingdom',label: 'Netflix UK' },
  { platform: 'netflix',      country: 'mexico',        label: 'Netflix MX' },
  { platform: 'netflix',      country: 'argentina',     label: 'Netflix AR' },
  { platform: 'netflix',      country: 'france',        label: 'Netflix FR' },
];

export async function fetchFlixPatrolMulti(targets: typeof FLIXPATROL_TARGETS = FLIXPATROL_TARGETS): Promise<FlixPatrolItem[]> {
  const results = await Promise.allSettled(
    targets.map(async t => {
      const html = await fetchPlatform(t.platform, t.country);
      return parseHtml(html, t.platform, t.country);
    })
  );
  const all: FlixPatrolItem[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') all.push(...r.value);
    else console.warn(`[flixpatrol] ${targets[i].platform}/${targets[i].country} error:`, (r.reason as Error).message);
  });
  return all;
}
