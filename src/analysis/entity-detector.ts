import { config } from '../config.js';
import { getState, updateState } from '../state/store.js';
import type { DiscoverEntity, EntityAlert, EntitySnapshot } from '../types.js';

export function detectEntityAlerts(entities: DiscoverEntity[]): EntityAlert[] {
  const state = getState();
  const prev = state.entities;
  const alerts: EntityAlert[] = [];
  const now = new Date().toISOString();
  const next: Record<string, EntitySnapshot> = {};

  for (const e of entities) {
    next[e.entity] = {
      score: e.score,
      scoreDecimal: e.score_decimal,
      position: e.position,
      publications: e.publications,
      firstSeen: prev[e.entity]?.firstSeen ?? now,
      lastUpdated: now,
    };

    const old = prev[e.entity];

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
      // Rising entity
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
    }
  }

  updateState({ entities: next });
  return alerts;
}
