import { join } from 'node:path';
import { loadFeeds, fetchAllFeeds } from '../sources/media-rss.js';
import { detectMediaDiscoverCorrelations } from '../analysis/media-correlator.js';
import { dedup } from '../analysis/dedup.js';
import { formatAlerts } from '../alerts/formatter.js';
import { sendBatch } from '../alerts/slack.js';
import { getState, updateState, saveState, persistAlerts } from '../state/store.js';
import { logger } from '../utils/logger.js';
import type { Alert } from '../types.js';

export async function runMediaPoll(): Promise<void> {
  logger.info('[media] Starting poll...');

  // Reload feeds config on every poll to pick up changes
  let feeds: Awaited<ReturnType<typeof loadFeeds>>;
  try {
    const feedsPath = join(process.cwd(), 'feeds.json');
    feeds = await loadFeeds(feedsPath);
    logger.info('[media] Loaded feeds', { count: feeds.length });
  } catch (err) {
    logger.error('[media] Failed to load feeds.json', { error: err instanceof Error ? err.message : String(err) });
    return;
  }

  const articles = await fetchAllFeeds(feeds);
  logger.info('[media] Fetched articles', { articles: articles.length, feeds: feeds.length });

  // Get cached Discover data for correlation
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

  const alerts: Alert[] = [];

  if (cachedEntities.length > 0 || cachedPages.length > 0) {
    alerts.push(...detectMediaDiscoverCorrelations(articles, cachedEntities, cachedPages));
  } else {
    logger.info('[media] No Discover data cached yet, skipping correlation');
  }

  const filtered = dedup(alerts);
  if (filtered.length > 0) {
    logger.info('[media] Sending alerts', { count: filtered.length, beforeDedup: alerts.length });
    persistAlerts(filtered);
    const messages = formatAlerts(filtered);
    await sendBatch(messages);
  } else {
    logger.info('[media] No new alerts', { suppressed: alerts.length });
  }

  updateState({ lastPollMedia: new Date().toISOString() });
  await saveState();
  logger.info('[media] Poll complete');
}
