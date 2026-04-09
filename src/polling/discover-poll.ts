import {
  fetchLiveEntities,
  fetchLiveCategories,
  fetchLivePages,
  fetchLiveDomains,
  fetchLiveSocial,
} from '../sources/discoversnoop.js';
import { detectEntityAlerts } from '../analysis/entity-detector.js';
import { detectCategoryAlerts } from '../analysis/category-detector.js';
import { detectHeadlinePatterns } from '../analysis/headline-patterns.js';
import { detectTrendsCorrelations } from '../analysis/trends-correlator.js';
import { dedup } from '../analysis/dedup.js';
import { formatAlerts } from '../alerts/formatter.js';
import { sendBatch } from '../alerts/slack.js';
import { getState, updateState, saveState } from '../state/store.js';
import type { Alert, PageSnapshot } from '../types.js';

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

  // Cache page snapshots so trends and media pollers can correlate against them
  const now = new Date().toISOString();
  const pageSnapshots: Record<string, PageSnapshot> = {};
  for (const p of pag) {
    pageSnapshots[p.url] = {
      title: p.title || p.title_original,
      score: p.score,
      position: p.position,
      lastUpdated: now,
    };
  }
  if (Object.keys(pageSnapshots).length > 0) {
    updateState({ pages: pageSnapshots });
  }

  // Run detectors
  const alerts: Alert[] = [];
  alerts.push(...detectEntityAlerts(ent));
  alerts.push(...detectCategoryAlerts(cat));
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

  // Dedup and send
  const filtered = dedup(alerts);
  if (filtered.length > 0) {
    console.log(`[discover] Sending ${filtered.length} alerts (${alerts.length} before dedup)`);
    const messages = formatAlerts(filtered);
    await sendBatch(messages);
  } else {
    console.log(`[discover] No new alerts (${alerts.length} suppressed by dedup)`);
  }

  updateState({ lastPollDiscover: new Date().toISOString() });
  await saveState();
  console.log('[discover] Poll complete');
}
