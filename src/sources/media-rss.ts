import { readFile } from 'node:fs/promises';
import { XMLParser } from 'fast-xml-parser';
import { fetchNewsSitemap } from './news-sitemap.js';
import type { MediaFeed, MediaArticle } from '../types.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // Disable entity processing to bypass fast-xml-parser's 1000-entity limit
  // that rejects large RSS feeds (some AS/Mundo Deportivo feeds have >1000
  // HTML entity references per document)
  processEntities: false,
});

function toArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

export async function loadFeeds(path: string): Promise<MediaFeed[]> {
  const raw = await readFile(path, 'utf-8');
  const parsed = JSON.parse(raw) as { feeds: MediaFeed[] };
  return parsed.feeds;
}

export async function fetchFeed(feed: MediaFeed): Promise<MediaArticle[]> {
  // Dispatch to specialized parsers by feed type
  if (feed.type === 'news-sitemap') {
    return fetchNewsSitemap(feed);
  }

  const res = await fetch(feed.url, {
    headers: { 'User-Agent': 'DiscoverAlerts/1.0' },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`RSS ${feed.name} ${res.status}`);
  }

  const xml = await res.text();
  const parsed = parser.parse(xml);

  // Handle both RSS 2.0 (rss.channel.item) and Atom (feed.entry)
  const items = toArray(parsed?.rss?.channel?.item) || toArray(parsed?.feed?.entry);

  return items.map((item: any) => {
    const title =
      typeof item.title === 'string' ? item.title :
      item.title?.['#text'] ?? '';

    const link =
      typeof item.link === 'string' ? item.link :
      item.link?.['@_href'] ?? item.link?.[0]?.['@_href'] ?? '';

    const pubDate = item.pubDate ?? item.published ?? item.updated ?? '';
    const description = item.description ?? item.summary ?? item.content ?? '';

    return {
      feedName: feed.name,
      feedCategory: feed.category,
      feedScope: feed.scope || 'nacional',
      title: title.trim(),
      link: typeof link === 'string' ? link.trim() : '',
      pubDate,
      description: typeof description === 'string'
        ? description.replace(/<[^>]*>/g, '').slice(0, 300)
        : '',
    };
  });
}

export async function fetchAllFeeds(feeds: MediaFeed[]): Promise<MediaArticle[]> {
  const results = await Promise.allSettled(
    feeds.map(feed => fetchFeed(feed)),
  );

  const articles: MediaArticle[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === 'fulfilled') {
      articles.push(...r.value);
    } else {
      console.warn(`[media-rss] Failed to fetch ${feeds[i].name}:`, r.reason?.message);
    }
  }

  return articles;
}
