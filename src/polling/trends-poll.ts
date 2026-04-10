import { fetchGoogleTrends } from '../sources/google-trends.js';
import { detectNewTrends, detectTrendsCorrelations } from '../analysis/trends-correlator.js';
import { dedup } from '../analysis/dedup.js';
import { dispatchAlerts } from '../alerts/dispatch.js';
import { getState, updateState, saveState } from '../state/store.js';
import type { Alert } from '../types.js';

export async function runTrendsPoll(): Promise<void> {
  console.log('[trends] Starting poll...');

  const isColdStart = getState().lastPollTrends === null;
  if (isColdStart) {
    console.log('[trends] Cold start detected — will seed state without sending alerts');
  }

  const trends = await fetchGoogleTrends();
  console.log(`[trends] Fetched ${trends.length} trending topics`);

  const alerts: Alert[] = [];

  // Detect new topics
  alerts.push(...detectNewTrends(trends));

  // Cross-reference with cached Discover data
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

  if (cachedEntities.length > 0 || cachedPages.length > 0) {
    alerts.push(...detectTrendsCorrelations(trends, cachedEntities, cachedPages));
  }

  if (isColdStart) {
    console.log(`[trends] Cold start: generated ${alerts.length} alerts but suppressing them`);
  } else {
    // Dedup, route and send
    const filtered = dedup(alerts);
    if (filtered.length > 0) {
      console.log(`[trends] Sending ${filtered.length} alerts`);
      await dispatchAlerts(filtered, 'trends');
    } else {
      console.log(`[trends] No new alerts`);
    }
  }

  updateState({ lastPollTrends: new Date().toISOString() });
  await saveState();
  console.log('[trends] Poll complete');
}
