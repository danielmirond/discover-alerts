/**
 * Apple Podcasts — Top podcasts ES
 * Fuente: Apple RSS Marketing Tools API (JSON oficial), sin key.
 *   https://rss.applemarketingtools.com/api/v2/es/podcasts/top/20/podcasts.json
 */

export interface ApplePodcastItem {
  rank: number;
  name: string;
  artistName?: string;
  artworkUrl?: string;
  url?: string;
  genre?: string;
}

const SOURCE_URL = 'https://rss.applemarketingtools.com/api/v2/es/podcasts/top/20/podcasts.json';

export async function fetchApplePodcastsES(): Promise<ApplePodcastItem[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10_000);
  const r = await fetch(SOURCE_URL, {
    signal: ctrl.signal,
    redirect: 'follow',
    headers: { 'user-agent': 'Mozilla/5.0 discover-alerts-apple-podcasts' },
  });
  clearTimeout(t);
  if (!r.ok) throw new Error(`Apple Podcasts HTTP ${r.status}`);
  const json = await r.json();
  const results = (json?.feed?.results || []) as any[];
  return results.map((it, i) => ({
    rank: i + 1,
    name: String(it.name || ''),
    artistName: it.artistName ? String(it.artistName) : undefined,
    artworkUrl: it.artworkUrl100 ? String(it.artworkUrl100) : undefined,
    url: it.url ? String(it.url) : undefined,
    genre: Array.isArray(it.genres) && it.genres[0]?.name ? String(it.genres[0].name) : undefined,
  }));
}
