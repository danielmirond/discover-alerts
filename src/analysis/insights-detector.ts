import { config } from '../config.js';
import { getState } from '../state/store.js';
import type {
  DiscoverEntity,
  DiscoverPage,
  TrendsItem,
  OwnMediaAbsentAlert,
  TrendsWithoutDiscoverAlert,
  HeadlineClusterAlert,
  StaleDataAlert,
} from '../types.js';

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function matchesOwnDomain(domain: string, ownDomains: string[]): boolean {
  if (!domain) return false;
  for (const own of ownDomains) {
    if (domain === own || domain.endsWith('.' + own)) return true;
  }
  return false;
}

/**
 * own_media_absent: entities (filtered by DS category) covered by N+ distinct
 * other media outlets in the cached state.mediaArticles window, where OUR
 * domain does NOT appear among the coverage. Signals: "they're on it, we're not".
 */
export function detectOwnMediaAbsent(): OwnMediaAbsentAlert[] {
  const ownDomains = config.ownMedia.domains;
  if (ownDomains.length === 0) return [];

  const state = getState();
  const alerts: OwnMediaAbsentAlert[] = [];
  const minOthers = config.ownMedia.absentMinOthers;
  const catFilter = config.ownMedia.absentCategoryFilter; // normalized lowercase

  // Pre-normalize entities for substring matching
  const entityList: Array<[string, string]> = Object.keys(state.entities)
    .filter(name => name.length > 3)
    .map(name => [name, normalize(name)]);

  for (const [entityName, entityNorm] of entityList) {
    // Category filter: only entities whose derived category contains catFilter
    const cat = state.entityCategoryMap[entityName];
    if (catFilter && (!cat || !cat.toLowerCase().includes(catFilter))) continue;

    const otherOutlets: Set<string> = new Set();
    const otherTitles: string[] = [];
    let ownPresent = false;

    for (const meta of Object.values(state.mediaArticles)) {
      if (!meta.title) continue;
      const titleNorm = normalize(meta.title);
      if (!titleNorm.includes(entityNorm)) continue;

      const articleDomain = extractDomain(meta.link);
      if (matchesOwnDomain(articleDomain, ownDomains)) {
        ownPresent = true;
        break;
      }
      otherOutlets.add(meta.feedName);
      if (otherTitles.length < 5) otherTitles.push(meta.title);
    }

    if (ownPresent) continue;
    if (otherOutlets.size < minOthers) continue;

    alerts.push({
      type: 'own_media_absent',
      entityName,
      category: cat,
      otherOutlets: Array.from(otherOutlets).slice(0, 8),
      otherTitles,
    });
  }

  return alerts;
}

/**
 * trends_without_discover: Google Trends topics with high traffic that are NOT
 * reflected in any DiscoverSnoop entity or page. SEO opportunity gap.
 */
export function detectTrendsWithoutDiscover(
  trends: TrendsItem[],
  pages: DiscoverPage[],
  entities: DiscoverEntity[],
): TrendsWithoutDiscoverAlert[] {
  const minTraffic = config.trendsWithoutDiscover.minApproxTraffic;
  const alerts: TrendsWithoutDiscoverAlert[] = [];

  // Pre-normalize everything we're comparing against
  const entityNorms = entities.map(e => normalize(e.entity));
  const pageTitleNorms = pages.map(p => normalize(p.title || p.title_original || ''));

  for (const trend of trends) {
    if (trend.approxTraffic < minTraffic) continue;

    const trendNorm = normalize(trend.title);
    if (trendNorm.length < 3) continue;

    // Check if the trend topic matches any entity or page
    const inEntities = entityNorms.some(en => en.includes(trendNorm) || trendNorm.includes(en));
    if (inEntities) continue;
    const inPages = pageTitleNorms.some(pt => pt.includes(trendNorm));
    if (inPages) continue;

    alerts.push({
      type: 'trends_without_discover',
      trendTitle: trend.title,
      approxTraffic: trend.approxTraffic,
      newsItems: trend.newsItems.slice(0, 3).map(n => ({
        title: n.title,
        url: n.url,
        source: n.source,
      })),
    });
  }

  return alerts;
}

/**
 * headline_cluster: detect if N+ distinct entities entered flash/spike within
 * the cluster window. Signals a "big event" (elections, disaster, major scandal).
 *
 * This is called from discover-poll with the alerts that were just produced.
 * Looks at entity alerts (flash/longtail) whose appearance timestamps fall
 * inside the cluster window, and fires if N+ distinct entity names are active.
 */
export function detectHeadlineCluster(
  entities: DiscoverEntity[],
): HeadlineClusterAlert[] {
  const state = getState();
  const minEntities = config.cluster.minEntities;
  const windowMs = config.cluster.windowHours * 3600_000;
  const nowMs = Date.now();

  const activeInWindow: string[] = [];
  for (const e of entities) {
    const snap = state.entities[e.entity];
    if (!snap?.appearances) continue;
    const inWindow = snap.appearances.filter(
      ts => nowMs - new Date(ts).getTime() <= windowMs,
    ).length;
    if (inWindow >= 2) {
      activeInWindow.push(e.entity);
    }
  }

  if (activeInWindow.length < minEntities) return [];

  return [
    {
      type: 'headline_cluster',
      entitiesInCluster: activeInWindow.slice(0, 20),
      windowHours: config.cluster.windowHours,
      timestamp: new Date().toISOString(),
    },
  ];
}

/**
 * stale_data: check each source's lastPoll timestamp and fire if any is stale.
 * Call this at the start of every poll so you get notified if OTHER sources died.
 */
export function detectStaleData(currentSource: 'discover' | 'trends' | 'media' | 'x'): StaleDataAlert[] {
  const state = getState();
  const maxMs = config.staleData.maxMinutesStale * 60_000;
  const nowMs = Date.now();
  const alerts: StaleDataAlert[] = [];

  const checks: Array<{ source: StaleDataAlert['source']; ts: string | null }> = [
    { source: 'discover', ts: state.lastPollDiscover },
    { source: 'trends', ts: state.lastPollTrends },
    { source: 'media', ts: state.lastPollMedia },
    { source: 'x', ts: state.lastPollX },
  ];

  for (const { source, ts } of checks) {
    if (source === currentSource) continue; // we're alive
    if (!ts) continue; // never ran - cold-start, not alertable
    const ageMs = nowMs - new Date(ts).getTime();
    if (ageMs > maxMs) {
      alerts.push({
        type: 'stale_data',
        source,
        lastPollAgoMinutes: Math.round(ageMs / 60_000),
      });
    }
  }

  return alerts;
}
