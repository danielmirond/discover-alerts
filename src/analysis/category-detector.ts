import { config } from '../config.js';
import { getState, updateState } from '../state/store.js';
import type { DiscoverCategory, CategoryAlert, CategorySnapshot } from '../types.js';

export function detectCategoryAlerts(
  categories: DiscoverCategory[],
  categoryNames: Record<number, string> = {},
): CategoryAlert[] {
  const state = getState();
  const prev = state.categories;
  const alerts: CategoryAlert[] = [];
  const now = new Date().toISOString();
  const next: Record<number, CategorySnapshot> = {};

  for (const c of categories) {
    const name = categoryNames[c.id] ?? prev[c.id]?.name ?? `Category ${c.id}`;
    next[c.id] = {
      name,
      score: c.score,
      scoreDecimal: c.score_decimal,
      position: c.position,
      publications: c.publications,
      lastUpdated: now,
    };

    const old = prev[c.id];
    if (!old) continue;

    const scoreDelta = c.score - old.score;
    const pubIncrease = old.publications > 0
      ? (c.publications - old.publications) / old.publications
      : 0;

    if (
      scoreDelta >= config.thresholds.categoryScoreJump ||
      pubIncrease >= config.thresholds.categoryPublicationsJumpPct
    ) {
      alerts.push({
        type: 'category',
        subtype: 'spike',
        id: c.id,
        name,
        score: c.score,
        prevScore: old.score,
        position: c.position,
        prevPosition: old.position,
        publications: c.publications,
        prevPublications: old.publications,
      });
    }
  }

  updateState({ categories: next });
  return alerts;
}
