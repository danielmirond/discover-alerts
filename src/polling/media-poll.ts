import { join } from 'node:path';
import { loadFeeds, fetchAllFeeds } from '../sources/media-rss.js';
import { detectMediaDiscoverCorrelations } from '../analysis/media-correlator.js';
import { dedup } from '../analysis/dedup.js';
import { formatAlerts } from '../alerts/formatter.js';
import { sendBatch } from '../alerts/slack.js';
import { getState, updateState, saveState } from '../state/store.js';
import type { Alert } from '../types.js';

let feedsLoaded = false;
let feeds: Awaited<ReturnType<typeof loadFeeds>> = [];

export async function runMediaPoll(): Promise<void> {
  console.log('[media] Starting poll...');

  // Load feeds config
  if (!feedsLoaded) {
    try {
      const feedsPath = join(process.cwd(), 'feeds.json');
      feeds = await loadFeeds(feedsPath);
      feedsLoaded = true;
      console.log(`[media] Loaded ${feeds.length} feeds`);
    } catch (err) {
      console.error('[media] Failed to load feeds.json:', err);
      return;
    }
  }

  const articles = await fetchAllFeeds(feeds);
  console.log(`[media] Fetched ${articles.length} articles from ${feeds.length} feeds`);

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
    console.log('[media] No Discover data cached yet, skipping correlation');
  }

  const filtered = dedup(alerts);
  if (filtered.length > 0) {
    console.log(`[media] Sending ${filtered.length} alerts (${alerts.length} before dedup)`);
    const messages = formatAlerts(filtered);
    await sendBatch(messages);
  } else {
    console.log(`[media] No new alerts (${alerts.length} suppressed by dedup)`);
  }

  updateState({ lastPollMedia: new Date().toISOString() });
  await saveState();
  console.log('[media] Poll complete');
}
