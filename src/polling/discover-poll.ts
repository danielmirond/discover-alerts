import {
  fetchLiveEntities,
  fetchLiveCategories,
  fetchLivePages,
  fetchLiveDomains,
  fetchLiveSocial,
  fetchCategoriesList,
} from '../sources/discoversnoop.js';
import { detectEntityAlerts } from '../analysis/entity-detector.js';
import { detectCategoryAlerts } from '../analysis/category-detector.js';
import { detectHeadlinePatterns } from '../analysis/headline-patterns.js';
import { detectTrendsCorrelations } from '../analysis/trends-correlator.js';
import { dedup } from '../analysis/dedup.js';
import { dispatchAlerts } from '../alerts/dispatch.js';
import { getState, updateState, saveState } from '../state/store.js';
import type { Alert } from '../types.js';

let categoryNamesCache: Record<number, string> | null = null;

async function getCategoryNames(): Promise<Record<number, string>> {
  if (categoryNamesCache) return categoryNamesCache;
  try {
    const list = await fetchCategoriesList();
    const map: Record<number, string> = {};
    for (const c of list as any[]) {
      if (c?.id != null && c?.name) map[c.id] = c.name;
    }
    categoryNamesCache = map;
    return map;
  } catch (err) {
    console.warn('[discover] Could not fetch categories list:', (err as Error).message);
    return {};
  }
}

export async function runDiscoverPoll(): Promise<void> {
  console.log('[discover] Starting poll...');

  const [entities, categories, pages, domains, social] = await Promise.allSettled([
    fetchLiveEntities(),
    fetchLiveCategories(),
    fetchLivePages(),
    fetchLiveDomains(),
    fetchLiveSocial(),
  ]);

  const ent = entities.status === 'fulfilled' ? entities.value : [];
  const cat = categories.status === 'fulfilled' ? categories.value : [];
  const pag = pages.status === 'fulfilled' ? pages.value : [];
  const dom = domains.status === 'fulfilled' ? domains.value : [];
  const soc = social.status === 'fulfilled' ? social.value : [];

  if (entities.status === 'rejected') console.error('[discover] entities error:', entities.reason);
  if (categories.status === 'rejected') console.error('[discover] categories error:', categories.reason);
  if (pages.status === 'rejected') console.error('[discover] pages error:', pages.reason);
  if (domains.status === 'rejected') console.error('[discover] domains error:', domains.reason);
  if (social.status === 'rejected') console.error('[discover] social error:', social.reason);

  console.log(`[discover] Fetched: ${ent.length} entities, ${cat.length} categories, ${pag.length} pages, ${dom.length} domains, ${soc.length} social`);

  // Run detectors
  const categoryNames = await getCategoryNames();
  const alerts: Alert[] = [];
  alerts.push(...detectEntityAlerts(ent, pag, categoryNames));
  alerts.push(...detectCategoryAlerts(cat, categoryNames, pag));
  alerts.push(...detectHeadlinePatterns(pag));

  // Cross-reference with cached trends data
  const state = getState();
  const cachedTrends = Object.entries(state.trends).map(([title, snap]) => ({
    title,
    approxTraffic: snap.approxTraffic,
    pubDate: '',
    link: '',
    newsItems: [],
  }));
  if (cachedTrends.length > 0) {
    alerts.push(...detectTrendsCorrelations(cachedTrends, ent, pag));
  }

  // Dedup, route, and send
  const filtered = dedup(alerts);
  if (filtered.length > 0) {
    console.log(`[discover] Sending ${filtered.length} alerts (${alerts.length} before dedup)`);
    await dispatchAlerts(filtered, 'discover');
  } else {
    console.log(`[discover] No new alerts (${alerts.length} suppressed by dedup)`);
  }

  updateState({ lastPollDiscover: new Date().toISOString() });
  await saveState();
  console.log('[discover] Poll complete');
}
