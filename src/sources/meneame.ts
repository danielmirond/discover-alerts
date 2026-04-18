import { XMLParser } from 'fast-xml-parser';

/**
 * Menéame — RSS público de la portada (publicadas).
 * Señal upstream: si algo es viral en Menéame antes de llegar a Discover,
 * nos da ~15-60 min de ventaja editorial. Los campos karma/votes/comments
 * son nativos de la plataforma y miden viralidad genuina.
 */

const RSS_URL = 'https://www.meneame.net/rss';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  processEntities: false,
});

function toArray<T>(v: T | T[] | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function parseIntSafe(v: any): number {
  if (typeof v === 'number') return v;
  const n = parseInt(String(v || '').replace(/[^0-9-]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

export interface MeneameStory {
  title: string;
  storyUrl: string; // meneame.net/story/...
  externalUrl: string; // link del articulo original
  pubDate: string;
  description: string;
  karma: number;
  votes: number;
  negatives: number;
  comments: number;
  clicks: number;
  sub: string; // actualidad, tecnologia, etc.
  user: string;
  categories: string[];
}

export async function fetchMeneame(): Promise<MeneameStory[]> {
  const res = await fetch(RSS_URL, { headers: { 'User-Agent': 'discover-alerts/1.0' } });
  if (!res.ok) throw new Error(`Meneame RSS ${res.status}`);
  const xml = await res.text();
  const parsed = parser.parse(xml);
  const items = toArray(parsed?.rss?.channel?.item);
  return items.map((it: any): MeneameStory => ({
    title: it.title || '',
    storyUrl: it.link || '',
    externalUrl: it['meneame:url'] || it.link || '',
    pubDate: it.pubDate || '',
    description: typeof it.description === 'string' ? it.description : '',
    karma: parseIntSafe(it['meneame:karma']),
    votes: parseIntSafe(it['meneame:votes']),
    negatives: parseIntSafe(it['meneame:negatives']),
    comments: parseIntSafe(it['meneame:comments']),
    clicks: parseIntSafe(it['meneame:clicks']),
    sub: String(it['meneame:sub'] || '').trim(),
    user: String(it['meneame:user'] || '').trim(),
    categories: toArray(it.category).map((c: any) => String(c || '').trim()).filter(Boolean),
  }));
}
