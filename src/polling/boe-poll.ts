import { fetchBoeSumario } from '../sources/boe.js';
import { detectBoeDiscoverCorrelations } from '../analysis/boe-correlator.js';
import { dedup } from '../analysis/dedup.js';
import { formatAlerts } from '../alerts/formatter.js';
import { sendBatch } from '../alerts/slack.js';
import { getState, updateState, saveState } from '../state/store.js';
import type { Alert } from '../types.js';

export async function runBoePoll(): Promise<void> {
  console.log('[boe] Starting poll...');

  const boeItems = await fetchBoeSumario();
  console.log(`[boe] Fetched ${boeItems.length} BOE items`);

  if (boeItems.length === 0) {
    updateState({ lastPollBoe: new Date().toISOString() });
    await saveState();
    console.log('[boe] No items today (Sunday/holiday?), poll complete');
    return;
  }

  // Get cached Discover data for correlation
  const state = getState();
  const cachedEntities = Object.entries(state.entities).map(([name, snap]) => ({
    entity: name,
    name,
    country: 'ES',
    score: snap.score,
    score_decimal: snap.scoreDecimal,
    position: snap.position,
    publications: snap.publications,
    firstviewed: snap.firstSeen,
    lastviewed: snap.lastUpdated,
  })) as any[];
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
    alerts.push(...detectBoeDiscoverCorrelations(boeItems, cachedEntities, cachedPages));
  } else {
    console.log('[boe] No Discover data cached yet, skipping correlation');
  }

  const filtered = dedup(alerts);
  if (filtered.length > 0) {
    console.log(`[boe] Sending ${filtered.length} alerts (${alerts.length} before dedup)`);
    const messages = await formatAlerts(filtered);
    await sendBatch(messages);
  } else {
    console.log(`[boe] No new alerts (${alerts.length} suppressed by dedup)`);
  }

  updateState({ lastPollBoe: new Date().toISOString() });
  await saveState();
  console.log('[boe] Poll complete');
}
