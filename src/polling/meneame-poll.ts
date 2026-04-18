import { fetchMeneame } from '../sources/meneame.js';
import { detectStaleData } from '../analysis/insights-detector.js';
import { loadTopicsDictionary, classifyText, pickBestTopic } from '../analysis/topic-classifier.js';
import { dedup } from '../analysis/dedup.js';
import { dispatchAlerts } from '../alerts/dispatch.js';
import { getState, updateState, saveState } from '../state/store.js';
import type { Alert, MeneameHotAlert } from '../types.js';

const MIN_KARMA = 400;       // umbral de viralidad inicial
const FRESH_HOURS = 6;

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

export async function runMeneamePoll(): Promise<void> {
  console.log('[meneame] Starting poll...');
  let stories;
  try {
    stories = await fetchMeneame();
  } catch (err) {
    console.error('[meneame] fetch error:', (err as Error).message);
    return;
  }
  console.log(`[meneame] Fetched ${stories.length} stories`);

  const state = getState();
  const nowMs = Date.now();
  const topicsDict = await loadTopicsDictionary();

  // Pre-normalize entity names for cross-ref
  const entityNorms = Object.keys(state.entities)
    .filter(n => n.length >= 4)
    .map(n => ({ name: n, norm: normalize(n) }));

  const alerts: Alert[] = [];

  for (const s of stories) {
    if (!s.title) continue;
    if (s.karma < MIN_KARMA) continue;
    const pubMs = s.pubDate ? new Date(s.pubDate).getTime() : NaN;
    if (!isNaN(pubMs) && (nowMs - pubMs) > FRESH_HOURS * 3600_000) continue;

    const titleNorm = normalize(s.title);
    const matching = entityNorms
      .filter(e => titleNorm.includes(e.norm) || e.norm.includes(titleNorm))
      .map(e => e.name)
      .slice(0, 5);

    const topic = pickBestTopic(classifyText(titleNorm, topicsDict), topicsDict);

    const alert: MeneameHotAlert = {
      type: 'meneame_hot',
      title: s.title,
      storyUrl: s.storyUrl,
      externalUrl: s.externalUrl,
      karma: s.karma,
      votes: s.votes,
      comments: s.comments,
      pubDate: s.pubDate,
      sub: s.sub,
      topic,
      matchingDiscoverEntities: matching,
      discoverAbsent: matching.length === 0,
    };
    alerts.push(alert);
  }

  // Health check
  alerts.push(...detectStaleData('trends')); // reuse 'trends' slot — Meneame es signal-only

  const filtered = dedup(alerts);
  if (filtered.length > 0) {
    console.log(`[meneame] Sending ${filtered.length} alerts (${alerts.length} before dedup)`);
    try {
      await dispatchAlerts(filtered, 'trends');
    } catch (err) {
      console.error('[meneame] dispatch error:', err);
    }
  } else {
    console.log('[meneame] No new alerts');
  }

  updateState({});
  await saveState();
  console.log('[meneame] Poll complete');
}
