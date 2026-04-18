import { join } from 'node:path';
import { loadFeeds, fetchAllFeeds } from '../sources/media-rss.js';
import { detectMediaDiscoverCorrelations } from '../analysis/media-correlator.js';
import { dedup } from '../analysis/dedup.js';
import { formatAlerts } from '../alerts/formatter.js';
import { sendBatch } from '../alerts/slack.js';
import { getState, updateState, saveState, persistAlerts } from '../state/store.js';
import { cachedEntities, cachedPages } from '../state/cached-shapes.js';
import { logger, getErrorMessage } from '../utils/logger.js';
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
    logger.error('[media] Failed to load feeds.json', { error: getErrorMessage(err) });
    return;
  }

  const articles = await fetchAllFeeds(feeds);
  logger.info('[media] Fetched articles', { articles: articles.length, feeds: feeds.length });

  // Get cached Discover data for correlation
  const state = getState();
  const ents = cachedEntities(state);
  const pgs = cachedPages(state);

  const alerts: Alert[] = [];

  if (ents.length > 0 || pgs.length > 0) {
    alerts.push(...detectMediaDiscoverCorrelations(articles, ents, pgs));
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
