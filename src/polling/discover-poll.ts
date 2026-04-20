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
import { detectConcordanceAlerts } from '../analysis/concordance-detector.js';
import { detectOwnMediaInDiscover, detectOwnMediaCoverage } from '../analysis/own-media-detector.js';
import {
  detectOwnMediaAbsent,
  detectTrendsWithoutDiscover,
  detectHeadlineCluster,
  detectStaleData,
} from '../analysis/insights-detector.js';
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

  // Cold-start detection: if we have no previous discover poll, this is the
  // first run. Seed state but do NOT dispatch alerts, otherwise we'd flood
  // Slack with every entity/category being "new" at once.
  const isColdStart = getState().lastPollDiscover === null;
  if (isColdStart) {
    console.log('[discover] Cold start detected — will seed state without sending alerts');
  }

  try {
    console.time('[discover] fetch');

    const [entities, categories, pages, domains, social] = await Promise.allSettled([
      fetchLiveEntities(),
      fetchLiveCategories(),
      fetchLivePages(),
      fetchLiveDomains(),
      fetchLiveSocial(),
    ]);

    console.timeEnd('[discover] fetch');

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

    console.time('[discover] detectors');

    const categoryNames = await getCategoryNames();
    const alerts: Alert[] = [];

    alerts.push(...(await detectEntityAlerts(ent, pag, categoryNames)));
    alerts.push(...detectCategoryAlerts(cat, categoryNames, pag));
    alerts.push(...detectHeadlinePatterns(pag));

    const state2 = getState();
    alerts.push(...detectConcordanceAlerts(ent, state2.entityCategoryMap, state2.entityTopicMap, pag));

    // Own-media: nuestro dominio apareciendo en Discover + cobertura joint
    alerts.push(...detectOwnMediaInDiscover(pag, categoryNames));
    alerts.push(...detectOwnMediaCoverage());

    // New insight alerts
    alerts.push(...detectOwnMediaAbsent());
    const state3 = getState();
    const cachedTrendsForGap = Object.entries(state3.trends).map(([title, snap]) => ({
      title,
      approxTraffic: snap.approxTraffic,
      pubDate: '',
      link: '',
      newsItems: [],
    }));
    if (cachedTrendsForGap.length > 0) {
      alerts.push(...(await detectTrendsWithoutDiscover(cachedTrendsForGap, pag, ent)));
    }
    alerts.push(...detectHeadlineCluster(ent));
    alerts.push(...detectStaleData('discover'));

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

    console.timeEnd('[discover] detectors');

    console.time('[discover] dispatch');

    if (isColdStart) {
      console.log(`[discover] Cold start: generated ${alerts.length} alerts but suppressing them`);
    } else {
      const filtered = dedup(alerts);

      if (filtered.length > 0) {
        console.log(`[discover] Sending ${filtered.length} alerts (${alerts.length} before dedup)`);
        try {
          await dispatchAlerts(filtered, 'discover');
        } catch (err) {
          console.error('[discover] dispatch error:', err);
        }
      } else {
        console.log(`[discover] No new alerts (${alerts.length} suppressed by dedup)`);
      }
    }

    console.timeEnd('[discover] dispatch');

    // Persist page snapshots (keyed by URL) para análisis cross-poll
    // (ej: /api/ds-publishers necesita saber qué dominios DS está viendo).
    // Retención: últimas ~24h — limitamos por tamaño para no reventar Redis.
    const PAGES_CAP = 500;
    const now = new Date().toISOString();
    const pageSnapshots: Record<string, { title: string; score: number; position: number; lastUpdated: string; image?: string; domain?: string }> = {};
    const sortedPag = [...pag].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, PAGES_CAP);
    for (const p of sortedPag) {
      if (!p.url) continue;
      pageSnapshots[p.url] = {
        title: p.title || '',
        score: p.score || 0,
        position: p.position || 0,
        lastUpdated: now,
        image: p.image,
        domain: p.domain,
      };
    }
    updateState({ lastPollDiscover: now, pages: pageSnapshots });

    try {
      await saveState();
    } catch (err) {
      console.error('[discover] saveState error:', err);
    }

    console.log('[discover] Poll complete');

  } catch (err) {
    console.error('[discover] fatal error inside poll:', err);
  }
}
