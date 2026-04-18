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
 * Downloads a URL, decompressing gzip (from .gz extension or magic bytes),
 * and returns the decoded XML string.
 */
async function fetchXml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'DiscoverAlerts/1.0' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`News sitemap ${res.status} for ${url}`);

  const arrayBuf = await res.arrayBuffer();
  let buf = Buffer.from(arrayBuf);
  if (url.endsWith('.gz') || isGzip(buf)) {
    try { buf = gunzipSync(buf); } catch { /* already decompressed */ }
  }
  return buf.toString('utf-8');
}

/**
 * Fetches a Google News-format sitemap and returns MediaArticles compatible
 * with the existing correlator. Handles:
 *   - `.gz` files (auto-decompress)
 *   - `<sitemapindex>` entries: follows the latest `<sitemap>` recursively
 *     (by `lastmod` descending), so URLs like NYT `espanol.xml.gz` that
 *     change every month don't need manual rotation.
 *
 * Standard fields extracted per <url> entry:
 *   - news:title        → article.title
 *   - news:publication_date (fallback: lastmod) → article.pubDate
 *   - loc               → article.link
 */
export async function fetchNewsSitemap(feed: MediaFeed): Promise<MediaArticle[]> {
  return fetchAndParse(feed, feed.url, 0);
}

async function fetchAndParse(feed: MediaFeed, url: string, depth: number): Promise<MediaArticle[]> {
  if (depth > 2) {
    // Guard against infinite recursion in broken sitemap indexes
    throw new Error(`News sitemap ${feed.name}: recursion too deep`);
  }

  const xml = await fetchXml(url);
  const parsed = parser.parse(xml);

  // If this is a sitemap index (list of sitemaps), follow the most recent one.
  const indexEntries = toArray<any>(parsed?.sitemapindex?.sitemap);
  if (indexEntries.length > 0) {
    // Sort by lastmod descending, pick the freshest
    const entries = indexEntries
      .map(s => ({
        loc: typeof s.loc === 'string' ? s.loc : s.loc?.['#text'] ?? '',
        lastmod: s.lastmod || '',
      }))
      .filter(e => e.loc)
      // Prefer loc URLs that look like monthly archives (e.g. 'espanol-2026-04.xml.gz')
      // over aggregate ones like 'espanol-collects.xml.gz'
      .sort((a, b) => (b.lastmod || '').localeCompare(a.lastmod || ''));

    if (entries.length === 0) return [];
    return fetchAndParse(feed, entries[0].loc, depth + 1);
  }

  const urls = toArray<any>(parsed?.urlset?.url);
  if (urls.length === 0) return [];

  const articles: MediaArticle[] = [];
  for (const entry of urls) {
    const loc = typeof entry.loc === 'string' ? entry.loc : entry.loc?.['#text'] ?? '';
    if (!loc) continue;

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

    if (!title) continue;

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
