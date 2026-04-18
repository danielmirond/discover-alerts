import { XMLParser } from 'fast-xml-parser';
import type { TrendsItem, TrendsNewsItem } from '../types.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  processEntities: false,
});

function parseTraffic(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9]/g, '');
  return parseInt(cleaned, 10) || 0;
}

function toArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

/**
 * Fetch Google Trends RSS for the given geo code (e.g. 'ES', 'US').
 * Default = ES for backward compatibility.
 */
export async function fetchGoogleTrends(geo: string = 'ES'): Promise<TrendsItem[]> {
  const url = `https://trends.google.com/trending/rss?geo=${encodeURIComponent(geo)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Google Trends RSS ${geo} ${res.status}: ${await res.text().catch(() => '')}`);
  }

  const xml = await res.text();
  const parsed = parser.parse(xml);

  const items = toArray(parsed?.rss?.channel?.item);

  return items.map((item: any) => {
    const newsRaw = toArray(item['ht:news_item']);
    const newsItems: TrendsNewsItem[] = newsRaw.map((n: any) => ({
      title: n['ht:news_item_title'] ?? n['ht:title'] ?? '',
      source: n['ht:news_item_source'] ?? n['ht:source'] ?? '',
      url: n['ht:news_item_url'] ?? n['ht:url'] ?? '',
      picture: n['ht:news_item_picture'] ?? n['ht:picture'] ?? undefined,
    }));

    return {
      title: item.title ?? '',
      approxTraffic: parseTraffic(item['ht:approx_traffic'] ?? ''),
      pubDate: item.pubDate ?? '',
      link: item.link ?? '',
      picture: item['ht:picture'] ?? undefined,
      newsItems,
    };
  });
}

/** Convenience wrapper for US trends. */
export function fetchGoogleTrendsUS(): Promise<TrendsItem[]> {
  return fetchGoogleTrends('US');
}
