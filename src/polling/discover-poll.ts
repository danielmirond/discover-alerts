import {
  fetchLiveEntities,
  fetchLiveCategories,
  fetchLivePages,
  fetchLiveDomains,
  fetchLiveSocial,
} from '../sources/discoversnoop.js';
import { detectEntityAlerts } from '../analysis/entity-detector.js';
import { detectCategoryAlerts } from '../analysis/category-detector.js';
import { detectDomainAlerts } from '../analysis/domain-detector.js';
import { detectSocialAlerts } from '../analysis/social-detector.js';
import { detectHeadlinePatterns } from '../analysis/headline-patterns.js';
import { detectTrendsCorrelations } from '../analysis/trends-correlator.js';
import { dedup } from '../analysis/dedup.js';
import { formatAlerts } from '../alerts/formatter.js';
import { sendBatch } from '../alerts/slack.js';
import { getState, updateState, saveState, persistAlerts } from '../state/store.js';
import { logger } from '../utils/logger.js';
import type { Alert } from '../types.js';

export async function runDiscoverPoll(): Promise<void> {
  logger.info('[discover] Starting poll...');

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

  if (entities.status === 'rejected') logger.error('[discover] entities error', { error: String(entities.reason) });
  if (categories.status === 'rejected') logger.error('[discover] categories error', { error: String(categories.reason) });
  if (pages.status === 'rejected') logger.error('[discover] pages error', { error: String(pages.reason) });
  if (domains.status === 'rejected') logger.error('[discover] domains error', { error: String(domains.reason) });
  if (social.status === 'rejected') logger.error('[discover] social error', { error: String(social.reason) });

  logger.info('[discover] Fetched data', { entities: ent.length, categories: cat.length, pages: pag.length, domains: dom.length, social: soc.length });

  // Run detectors
  const alerts: Alert[] = [];
  alerts.push(...detectEntityAlerts(ent));
  alerts.push(...detectCategoryAlerts(cat));
  alerts.push(...detectDomainAlerts(dom));
  alerts.push(...detectSocialAlerts(soc));
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

  // Dedup, persist and send
  const filtered = dedup(alerts);
  if (filtered.length > 0) {
    logger.info('[discover] Sending alerts', { count: filtered.length, beforeDedup: alerts.length });
    persistAlerts(filtered);
    const messages = formatAlerts(filtered);
    await sendBatch(messages);
  } else {
    logger.info('[discover] No new alerts', { suppressed: alerts.length });
  }

  updateState({ lastPollDiscover: new Date().toISOString() });
  await saveState();
  logger.info('[discover] Poll complete');
}
