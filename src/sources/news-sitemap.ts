import { gunzipSync } from 'node:zlib';
import { XMLParser } from 'fast-xml-parser';
import type { MediaFeed, MediaArticle } from '../types.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  processEntities: false,
  // News sitemaps use ns-prefixed tags (news:news, news:title, ...).
  // fast-xml-parser strips the colon and exposes them as keys like 'news:title'
  // which works fine for our lookups via bracket access.
});

function toArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

/**
 * Detects if a buffer starts with the gzip magic bytes (0x1f 0x8b).
 */
function isGzip(buf: Uint8Array): boolean {
  return buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b;
}

/**
 * Fetches a Google News-format sitemap and returns MediaArticles compatible
 * with the existing correlator. Handles `.gz` files automatically.
 *
 * Standard fields extracted per <url> entry:
 *   - news:title        → article.title
 *   - news:publication_date (fallback: lastmod) → article.pubDate
 *   - loc               → article.link
 */
export async function fetchNewsSitemap(feed: MediaFeed): Promise<MediaArticle[]> {
  const res = await fetch(feed.url, {
    headers: { 'User-Agent': 'DiscoverAlerts/1.0' },
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    throw new Error(`News sitemap ${feed.name} ${res.status}`);
  }

  const arrayBuf = await res.arrayBuffer();
  let buf = Buffer.from(arrayBuf);

  // Handle gzip (whether from .gz URL or Content-Encoding that fetch didn't decompress)
  if (feed.url.endsWith('.gz') || isGzip(buf)) {
    try {
      buf = gunzipSync(buf);
    } catch {
      // Already decompressed — some servers auto-decompress
    }
  }

  const xml = buf.toString('utf-8');
  const parsed = parser.parse(xml);

  const urls = toArray<any>(parsed?.urlset?.url);
  if (urls.length === 0) return [];

  const articles: MediaArticle[] = [];
  for (const entry of urls) {
    const loc = typeof entry.loc === 'string' ? entry.loc : entry.loc?.['#text'] ?? '';
    if (!loc) continue;

    // news:news may be present as 'news:news' or 'news' depending on parser behavior
    const newsNode = entry['news:news'] || entry.news;
    const title =
      newsNode?.['news:title'] ||
      newsNode?.title ||
      '';

    const pubDate =
      newsNode?.['news:publication_date'] ||
      newsNode?.publication_date ||
      entry.lastmod ||
      '';

    if (!title) continue; // skip entries with no title (can't detect entities)

    articles.push({
      feedName: feed.name,
      feedCategory: feed.category,
      feedScope: feed.scope || 'nacional',
      title: String(title).trim(),
      link: String(loc).trim(),
      pubDate: String(pubDate).trim(),
      description: '',
    });
  }

  return articles;
}
