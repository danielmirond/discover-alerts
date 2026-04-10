import { config } from '../config.js';
import { getState, updateState } from '../state/store.js';
import type { DiscoverEntity, EntityAlert, EntitySnapshot } from '../types.js';

export function detectEntityAlerts(entities: DiscoverEntity[]): EntityAlert[] {
  const state = getState();
  const prev = state.entities;
  const alerts: EntityAlert[] = [];
  const now = new Date().toISOString();
  const nowMs = Date.now();
  const next: Record<string, EntitySnapshot> = {};

  const ascendingMin = config.thresholds.entityAscendingMinAppearances;
  const ascendingWindowMs = config.thresholds.entityAscendingWindowHours * 3600_000;

  for (const e of entities) {
    const old = prev[e.entity];

    // Build appearances array: previous ones (pruned) + current poll timestamp
    const prevAppearances = old?.appearances ?? [];
    const appearances = [
      ...prevAppearances.filter(ts => nowMs - new Date(ts).getTime() <= ascendingWindowMs),
      now,
    ];

    next[e.entity] = {
      score: e.score,
      scoreDecimal: e.score_decimal,
      position: e.position,
      publications: e.publications,
      firstSeen: old?.firstSeen ?? now,
      lastUpdated: now,
      appearances,
    };

    if (!old) {
      // New entity
      if (e.score >= config.thresholds.entityNewMinScore) {
        alerts.push({
          type: 'entity',
          subtype: 'new',
          name: e.entity,
          score: e.score,
          prevScore: 0,
          scoreDecimal: e.score_decimal,
          position: e.position,
          prevPosition: 0,
          publications: e.publications,
          firstviewed: next[e.entity].firstSeen,
        });
      }
    } else {
      // Rising entity (score jump)
      const scoreDelta = e.score - old.score;
      if (scoreDelta >= config.thresholds.entityScoreJump) {
        alerts.push({
          type: 'entity',
          subtype: 'rising',
          name: e.entity,
          score: e.score,
          prevScore: old.score,
          scoreDecimal: e.score_decimal,
          position: e.position,
          prevPosition: old.position,
          publications: e.publications,
          firstviewed: old.firstSeen,
        });
      }

      // Ascending entity: fires when the entity crosses the appearances threshold
      // in the current polling window. Only triggers on the crossing poll to avoid
      // repeating the same alert on every subsequent poll.
      const prevAppearancesInWindow = prevAppearances.filter(
        ts => nowMs - new Date(ts).getTime() <= ascendingWindowMs,
      ).length;
      const currentAppearancesInWindow = appearances.length;

      if (
        prevAppearancesInWindow < ascendingMin &&
        currentAppearancesInWindow >= ascendingMin
      ) {
        alerts.push({
          type: 'entity',
          subtype: 'ascending',
          name: e.entity,
          score: e.score,
          prevScore: old.score,
          scoreDecimal: e.score_decimal,
          position: e.position,
          prevPosition: old.position,
          publications: e.publications,
          firstviewed: old.firstSeen,
          appearanceCount: currentAppearancesInWindow,
          windowHours: config.thresholds.entityAscendingWindowHours,
        });
      }
    }
  }

  updateState({ entities: next });
  return alerts;
}
