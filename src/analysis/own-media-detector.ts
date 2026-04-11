import { config } from '../config.js';
import { getState } from '../state/store.js';
import type {
  DiscoverPage,
  TrendsItem,
  OwnMediaAlert,
} from '../types.js';

function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function matchesOwnDomain(domain: string, ownDomains: string[]): string | null {
  if (!domain) return null;
  for (const own of ownDomains) {
    if (domain === own || domain.endsWith('.' + own)) return own;
  }
  return null;
}

/**
 * Detects if one of our own media domains appears in:
 *  (1) DiscoverSnoop pages (direct surface in Google Discover)
 *  (2) Google Trends RSS news items
 */
export function detectOwnMediaInDiscover(
  pages: DiscoverPage[],
  categoryNames: Record<number, string> = {},
): OwnMediaAlert[] {
  const ownDomains = config.ownMedia.domains;
  if (ownDomains.length === 0) return [];

  const alerts: OwnMediaAlert[] = [];

  for (const page of pages) {
    const domain = extractDomain(page.url) ||
                   (page.publisher ? page.publisher.toLowerCase().replace(/^www\./, '') : '') ||
                   (page.domain ? page.domain.toLowerCase().replace(/^www\./, '') : '');
    const own = matchesOwnDomain(domain, ownDomains);
    if (!own) continue;

    let categoryName: string | undefined;
    if (typeof page.category === 'number') {
      categoryName = categoryNames[page.category];
    } else if (typeof page.category === 'string') {
      categoryName = page.category;
    }

    alerts.push({
      type: 'own_media',
      subtype: 'discover_page',
      ownDomain: own,
      title: page.title || page.title_original || '(sin titulo)',
      url: page.url,
      score: page.score,
      position: page.position,
      category: categoryName,
    });
  }

  return alerts;
}

export function detectOwnMediaInTrends(trends: TrendsItem[]): OwnMediaAlert[] {
  const ownDomains = config.ownMedia.domains;
  if (ownDomains.length === 0) return [];

  const alerts: OwnMediaAlert[] = [];

  for (const trend of trends) {
    for (const news of trend.newsItems) {
      const domain = extractDomain(news.url);
      const own = matchesOwnDomain(domain, ownDomains);
      if (!own) continue;

      alerts.push({
        type: 'own_media',
        subtype: 'trends_news',
        ownDomain: own,
        title: news.title,
        url: news.url,
        trendTopic: trend.title,
      });
    }
  }

  return alerts;
}

/**
 * Detects "coverage_join" alerts: any entity covered by our own media AND
 * by at least N OTHER media outlets in the same 24h window. This signals
 * that an editorial topic is being covered jointly.
 */
export function detectOwnMediaCoverage(): OwnMediaAlert[] {
  const ownDomains = config.ownMedia.domains;
  if (ownDomains.length === 0) return [];

  const state = getState();
  const minOthers = config.ownMedia.coverageMinOtherOutlets;
  const alerts: OwnMediaAlert[] = [];

  // For each entity in state, check if it's covered by our domain + others
  // Entity-to-article hits: scan state.mediaArticles titles
  function normalize(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  const entityNames = Object.keys(state.entities).filter(n => n.length > 3);

  for (const entityName of entityNames) {
    const entityNorm = normalize(entityName);
    const ownOutlets: string[] = [];
    const otherOutlets: Set<string> = new Set();
    let sampleOwnTitle = '';
    let sampleOwnUrl = '';

    for (const meta of Object.values(state.mediaArticles)) {
      if (!meta.title) continue;
      const titleNorm = normalize(meta.title);
      if (!titleNorm.includes(entityNorm)) continue;

      const articleDomain = extractDomain(meta.link);
      const own = matchesOwnDomain(articleDomain, ownDomains);
      if (own) {
        ownOutlets.push(own);
        if (!sampleOwnTitle) {
          sampleOwnTitle = meta.title;
          sampleOwnUrl = meta.link;
        }
      } else {
        otherOutlets.add(meta.feedName);
      }
    }

    if (ownOutlets.length > 0 && otherOutlets.size >= minOthers) {
      alerts.push({
        type: 'own_media',
        subtype: 'coverage_join',
        ownDomain: ownOutlets[0],
        title: sampleOwnTitle || entityName,
        url: sampleOwnUrl || undefined,
        otherOutlets: Array.from(otherOutlets).slice(0, 10),
        category: state.entityCategoryMap[entityName],
      });
    }
  }

  return alerts;
}
