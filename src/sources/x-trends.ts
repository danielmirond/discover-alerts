import type { XTrendItem } from '../types.js';

const FEED_URL = 'https://getdaytrends.com/es/spain/';

/**
 * Scrapes getdaytrends.com to extract Spain's Twitter/X trending topics.
 * The HTML pattern is stable: each trend row contains:
 *   <td class="main"><a [class="string"] href="/es/spain/trend/<topic>/">Topic</a>
 * Uses regex since the site has no API.
 */
export async function fetchXTrends(): Promise<XTrendItem[]> {
  const res = await fetch(FEED_URL, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; DiscoverAlerts/1.0; +https://github.com/danielmirond/discover-alerts)',
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`getdaytrends ${res.status}: ${res.statusText}`);
  }

  const html = await res.text();
  const items: XTrendItem[] = [];

  // Match: class="main"><a [optional class]...href="..."...>Topic</a>
  const rowPattern = /class="main"><a[^>]*href="([^"]+)"[^>]*>([^<]+)</g;
  let match: RegExpExecArray | null;
  let rank = 0;

  while ((match = rowPattern.exec(html)) !== null) {
    rank++;
    const relPath = match[1];
    const topic = match[2].trim();
    if (!topic) continue;

    items.push({
      rank,
      topic,
      url: new URL(relPath, 'https://getdaytrends.com').toString(),
    });

    // Safety cap - getdaytrends shows up to 50
    if (rank >= 50) break;
  }

  return items;
}
