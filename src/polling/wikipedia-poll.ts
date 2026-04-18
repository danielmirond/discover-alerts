import { fetchWikipediaSurges } from '../sources/wikipedia.js';
import { loadTopicsDictionary, classifyText, pickBestTopic } from '../analysis/topic-classifier.js';
import { dedup } from '../analysis/dedup.js';
import { dispatchAlerts } from '../alerts/dispatch.js';
import { getState, updateState, saveState } from '../state/store.js';
import type { Alert, WikipediaSurgeAlert } from '../types.js';

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

export async function runWikipediaPoll(): Promise<void> {
  console.log('[wikipedia] Starting poll...');
  let surges;
  try {
    surges = await fetchWikipediaSurges();
  } catch (err) {
    console.error('[wikipedia] fetch error:', (err as Error).message);
    return;
  }
  console.log(`[wikipedia] Detected ${surges.length} surging articles`);

  const state = getState();
  const topicsDict = await loadTopicsDictionary();
  const entityNorms = Object.keys(state.entities)
    .filter(n => n.length >= 4)
    .map(n => ({ name: n, norm: normalize(n) }));

  const alerts: Alert[] = [];

  for (const s of surges) {
    const titleNorm = normalize(s.title);
    const matching = entityNorms
      .filter(e => titleNorm.includes(e.norm) || e.norm.includes(titleNorm))
      .map(e => e.name)
      .slice(0, 5);

    const topic = pickBestTopic(classifyText(titleNorm, topicsDict), topicsDict);

    const alert: WikipediaSurgeAlert = {
      type: 'wikipedia_surge',
      title: s.title,
      url: s.url,
      editCount: s.editCount,
      uniqueEditors: s.uniqueEditors,
      windowMinutes: s.windowMinutes,
      topic,
      matchingDiscoverEntities: matching,
      discoverAbsent: matching.length === 0,
    };
    alerts.push(alert);
  }

  const filtered = dedup(alerts);
  if (filtered.length > 0) {
    console.log(`[wikipedia] Sending ${filtered.length} alerts (${alerts.length} before dedup)`);
    try {
      await dispatchAlerts(filtered, 'trends');
    } catch (err) {
      console.error('[wikipedia] dispatch error:', err);
    }
  } else {
    console.log('[wikipedia] No new alerts');
  }

  updateState({});
  await saveState();
  console.log('[wikipedia] Poll complete');
}
