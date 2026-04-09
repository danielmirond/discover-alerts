import { fetchGoogleTrends } from '../sources/google-trends.js';
import { detectNewTrends, detectTrendsCorrelations } from '../analysis/trends-correlator.js';
import { dedup } from '../analysis/dedup.js';
import { formatAlerts } from '../alerts/formatter.js';
import { sendBatch } from '../alerts/slack.js';
import { getState, updateState, saveState, persistAlerts } from '../state/store.js';
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
  const cachedEntities = Object.entries(state.entities).map(([name, snap]) => ({
    name,
    score: snap.score,
    score_decimal: snap.scoreDecimal,
    position: snap.position,
    publications: snap.publications,
    firstviewed: snap.firstSeen,
    lastviewed: snap.lastUpdated,
  }));
  const cachedPages = Object.entries(state.pages).map(([url, snap]) => ({
    url,
    title: snap.title,
    title_original: snap.title,
    title_english: '',
    image: '',
    snippet: '',
    publisher: '',
    domain: '',
    category: '',
    story_type: '',
    score: snap.score,
    score_decimal: 0,
    position: snap.position,
    publications: 0,
    firstviewed: '',
    lastviewed: snap.lastUpdated,
    is_new: false,
    is_video: false,
    is_webstory: false,
    entities: [],
    ai_overviews: [],
  }));

  if (cachedEntities.length > 0 || cachedPages.length > 0) {
    alerts.push(...detectTrendsCorrelations(trends, cachedEntities, cachedPages));
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
