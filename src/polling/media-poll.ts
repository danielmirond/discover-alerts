import { join } from 'node:path';
import { loadFeeds, fetchAllFeeds } from '../sources/media-rss.js';
import { detectMediaDiscoverCorrelations } from '../analysis/media-correlator.js';
import { dedup } from '../analysis/dedup.js';
import { dispatchAlerts } from '../alerts/dispatch.js';
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
  const cachedEntities = Object.entries(state.entities).map(([entityName, snap]) => ({
    entity: entityName,
    country: 'ES',
    score: snap.score,
    score_decimal: snap.scoreDecimal,
    position: snap.position,
    publications: snap.publications,
  }));
  const cachedPages = Object.entries(state.pages).map(([url, snap]) => ({
    url,
    title: snap.title,
    score: snap.score,
    position: snap.position,
  }));

  const alerts: Alert[] = [];

  if (cachedEntities.length > 0 || cachedPages.length > 0) {
    alerts.push(
      ...detectMediaDiscoverCorrelations(
        articles,
        cachedEntities,
        cachedPages,
        state.entityCategoryMap,
      ),
    );
  } else {
    console.log('[media] No Discover data cached yet, skipping correlation');
  }

  const filtered = dedup(alerts);
  if (filtered.length > 0) {
    console.log(`[media] Sending ${filtered.length} alerts (${alerts.length} before dedup)`);
    await dispatchAlerts(filtered, 'media');
  } else {
    console.log(`[media] No new alerts (${alerts.length} suppressed by dedup)`);
  }

  updateState({ lastPollMedia: new Date().toISOString() });
  await saveState();
  console.log('[media] Poll complete');
}
