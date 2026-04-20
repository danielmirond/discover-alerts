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

/** Parsea el HTML buscando bloques de Top 10 por categoría (TV/Movies). */
function parseHtml(html: string, platform: string): FlixPatrolItem[] {
  const out: FlixPatrolItem[] = [];
  // Las entries suelen venir como:
  //   <td>1</td><td><a href="/title/...">Título</a></td>
  // dentro de tablas con class "card-table". Capturamos pairs rank+title.
  // Nos apoyamos en el path para diferenciar TV vs Movies: /title/... con meta.

  // Estrategia simple: regex sobre <a href="/title/xxx/">TITULO</a> precedidos de <td class="table-td">N</td>
  const re = /<td[^>]*>\s*(\d{1,2})\s*<\/td>\s*<td[^>]*>\s*<a[^>]*href="\/title\/[^"]+"[^>]*>([^<]+)<\/a>/g;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  // Detectar secciones TV / Movies por su heading cercano
  // Buscar ocurrencias de "TV Shows" y "Movies" y acotar las regiones
  const tvIdx = html.search(/TV Shows/i);
  const moviesIdx = html.search(/Movies/i);
  const sections: Array<{ start: number; end: number; category: 'TV' | 'Movies' }> = [];
  if (tvIdx >= 0) {
    sections.push({ start: tvIdx, end: moviesIdx > tvIdx ? moviesIdx : html.length, category: 'TV' });
  }
  if (moviesIdx >= 0) {
    sections.push({ start: moviesIdx, end: moviesIdx < tvIdx ? tvIdx : html.length, category: 'Movies' });
  }
  if (sections.length === 0) {
    // Fallback: todo el documento como unknown
    sections.push({ start: 0, end: html.length, category: 'Movies' });
  }

  for (const sec of sections) {
    const region = html.slice(sec.start, sec.end);
    re.lastIndex = 0;
    while ((m = re.exec(region))) {
      const rank = parseInt(m[1], 10);
      const title = m[2].trim();
      if (!title || rank < 1 || rank > 10) continue;
      const key = `${sec.category}:${rank}:${title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ rank, title, category: sec.category });
    }
  }

  return out.filter(i => i.rank <= 10).slice(0, 50);
}

export async function fetchFlixPatrolNetflixES(): Promise<FlixPatrolItem[]> {
  const html = await fetchPlatform('netflix');
  return parseHtml(html, 'netflix');
}
