import { fetchXTrends } from '../sources/x-trends.js';
import { getState, updateState, saveState } from '../state/store.js';
import type { XTrendSnapshot } from '../types.js';

export async function runXPoll(): Promise<void> {
  console.log('[x-trends] Starting poll...');

  const trends = await fetchXTrends();
  console.log(`[x-trends] Fetched ${trends.length} trending topics from getdaytrends.com`);

  const state = getState();
  const prev = state.xTrends;
  const now = new Date().toISOString();
  const next: Record<string, XTrendSnapshot> = {};

  for (const t of trends) {
    next[t.topic] = {
      rank: t.rank,
      firstSeen: prev[t.topic]?.firstSeen ?? now,
      lastUpdated: now,
    };
  }

  updateState({ xTrends: next, lastPollX: now });
  await saveState();
  console.log('[x-trends] Poll complete, state updated');
}
