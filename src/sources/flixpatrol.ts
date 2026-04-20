/**
 * FlixPatrol Top 10 España — scrapea HTML público.
 * Fuente: https://flixpatrol.com/top10/netflix/spain/today/
 * Refleja Top 10 Netflix ES del día (más fresco que el TSV semanal de Netflix).
 */

export interface FlixPatrolItem {
  rank: number;
  title: string;
  category: 'TV' | 'Movies';
}

async function fetchPlatform(platform: string): Promise<string> {
  const url = `https://flixpatrol.com/top10/${platform}/spain/today/`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15_000);
  const r = await fetch(url, {
    signal: ctrl.signal,
    redirect: 'follow',
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; discover-alerts-flixpatrol)' },
  });
  clearTimeout(t);
  if (!r.ok) throw new Error(`FlixPatrol ${platform} HTTP ${r.status}`);
  return r.text();
}

/**
 * Parser v2: FlixPatrol ya no usa <td rank><td title>. Los titles vienen como
 * <a href="/title/…">Titulo</a> dentro de una sección TV Shows o Movies.
 *
 * Estrategia: dividir el HTML en dos regiones (TV Shows / Movies) por los
 * h3 con ese texto, y extraer los primeros 10 <a href="/title/…"> de cada una.
 */
function parseHtml(html: string, _platform: string): FlixPatrolItem[] {
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
      out.push({ rank, title, category: sec.category });
      rank++;
    }
  }
  return out;
}

export async function fetchFlixPatrolNetflixES(): Promise<FlixPatrolItem[]> {
  const html = await fetchPlatform('netflix');
  return parseHtml(html, 'netflix');
}
