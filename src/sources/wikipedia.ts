/**
 * Wikipedia ES — lista de cambios recientes (recentchanges) agregada por
 * articulo. Articulos con spike de edits desde usuarios distintos en los
 * ultimos 30 min = senal de breaking news (editores llegando a actualizar).
 *
 * Ventaja sobre Discover: los articulos de Wikipedia se editan minutos
 * despues de que ocurre algo, no horas. Ejemplo clasico: muerte de una
 * figura publica -> 5+ edits en 10 min antes de que los medios grandes
 * publiquen.
 */

export interface WikipediaSurge {
  /** Titulo del articulo Wikipedia (namespace 0 = content) */
  title: string;
  /** URL canonica del articulo en es.wikipedia */
  url: string;
  /** Numero de edits en la ventana */
  editCount: number;
  /** Usuarios unicos editando */
  uniqueEditors: number;
  /** Timestamp de la primera edit en la ventana */
  firstEdit: string;
  /** Timestamp de la ultima edit en la ventana */
  lastEdit: string;
  /** Ventana considerada en minutos */
  windowMinutes: number;
}

const API_URL = 'https://es.wikipedia.org/w/api.php';

export async function fetchWikipediaSurges(
  windowMinutes = 30,
  minEdits = 4,
  minEditors = 2,
): Promise<WikipediaSurge[]> {
  const url = `${API_URL}?action=query&list=recentchanges&rclimit=500&rcnamespace=0&rcprop=title|timestamp|ids|user&rctype=edit&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'discover-alerts/1.0' } });
  if (!res.ok) throw new Error(`Wikipedia recent-changes ${res.status}`);
  const data = await res.json() as any;
  const changes = (data?.query?.recentchanges || []) as any[];

  const cutoffMs = Date.now() - windowMinutes * 60_000;

  // Agrupar por title
  type Bucket = { edits: number; editors: Set<string>; first: string; last: string };
  const byTitle = new Map<string, Bucket>();
  for (const c of changes) {
    if (!c.title || !c.timestamp) continue;
    const ts = new Date(c.timestamp).getTime();
    if (ts < cutoffMs) continue;
    // Excluir artículos administrativos y bots-only si conseguimos detectar
    if (c.title.startsWith('Wikipedia:') || c.title.startsWith('Ayuda:') ||
        c.title.startsWith('Plantilla:') || c.title.startsWith('Categoría:')) continue;
    const b = byTitle.get(c.title) || { edits: 0, editors: new Set<string>(), first: c.timestamp, last: c.timestamp };
    b.edits++;
    if (c.user) b.editors.add(c.user);
    if (c.timestamp < b.first) b.first = c.timestamp;
    if (c.timestamp > b.last) b.last = c.timestamp;
    byTitle.set(c.title, b);
  }

  const out: WikipediaSurge[] = [];
  for (const [title, b] of byTitle) {
    if (b.edits < minEdits) continue;
    if (b.editors.size < minEditors) continue;
    // Filtrar bots evidentes: si todos los editores terminan en "BOT" lo salteamos
    const allBots = Array.from(b.editors).every(u => /bot$/i.test(u) || /^~/.test(u));
    if (allBots && b.editors.size < 4) continue;
    out.push({
      title,
      url: `https://es.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
      editCount: b.edits,
      uniqueEditors: b.editors.size,
      firstEdit: b.first,
      lastEdit: b.last,
      windowMinutes,
    });
  }
  // Sort por intensidad: editors * sqrt(edits)
  out.sort((a, b) => (b.uniqueEditors * Math.sqrt(b.editCount)) - (a.uniqueEditors * Math.sqrt(a.editCount)));
  return out.slice(0, 50);
}
