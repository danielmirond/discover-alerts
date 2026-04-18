import { fetchGoogleTrends } from '../sources/google-trends.js';
import { detectNewTrends, detectTrendsCorrelations } from '../analysis/trends-correlator.js';
import { dedup } from '../analysis/dedup.js';
import { formatAlerts } from '../alerts/formatter.js';
import { sendBatch } from '../alerts/slack.js';
import { getState, updateState, saveState, persistAlerts } from '../state/store.js';
import { cachedEntities, cachedPages } from '../state/cached-shapes.js';
import { logger } from '../utils/logger.js';
import type { Alert } from '../types.js';

export async function runTrendsPoll(): Promise<void> {
  logger.info('[trends] Starting poll...');

  const trends = await fetchGoogleTrends();
  logger.info('[trends] Fetched trending topics', { count: trends.length });

  const alerts: Alert[] = [];

  // Detect new topics
  alerts.push(...detectNewTrends(trends));

  // Cross-reference with cached Discover data
  const state = getState();
  const ents = cachedEntities(state);
  const pgs = cachedPages(state);

  if (ents.length > 0 || pgs.length > 0) {
    alerts.push(...detectTrendsCorrelations(trends, ents, pgs));
  }

  // Dedup, persist and send
  const filtered = dedup(alerts);
  if (filtered.length > 0) {
    logger.info('[trends] Sending alerts', { count: filtered.length });
    persistAlerts(filtered);
    const messages = formatAlerts(filtered);
    await sendBatch(messages);
  } else {
    logger.info('[trends] No new alerts');
  }

  updateState({ lastPollTrends: new Date().toISOString() });
  await saveState();
  logger.info('[trends] Poll complete');
}
