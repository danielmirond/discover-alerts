import { config } from '../config.js';
import { getState, updateState } from '../state/store.js';
import type { Alert } from '../types.js';

function alertKey(alert: Alert): string {
  switch (alert.type) {
    case 'entity':
      return `entity:${alert.subtype}:${alert.name}`;
    case 'category':
      return `category:${alert.id}`;
    case 'headline_pattern':
      return `headline:${alert.ngram}`;
    case 'trends_correlation':
      return `correlation:${alert.trendTitle}`;
    case 'trends_new_topic':
      return `trend_new:${alert.title}`;
    case 'entity_coverage':
      return `entity_coverage:${alert.entityName}`;
    case 'entity_concordance':
      return `concordance:${alert.subtype}:${alert.entityName}`;
    case 'own_media':
      return `own_media:${alert.subtype}:${alert.url || alert.title}`;
  }
}

export function dedup(alerts: Alert[]): Alert[] {
  const state = getState();
  const hashes = { ...state.dedupHashes };
  const windowMs = config.dedup.windowHours * 3600_000;
  const now = Date.now();

  // Prune expired hashes
  for (const [key, ts] of Object.entries(hashes)) {
    if (now - ts > windowMs) delete hashes[key];
  }

  const result: Alert[] = [];
  for (const alert of alerts) {
    const key = alertKey(alert);
    if (hashes[key] && now - hashes[key] < windowMs) continue;
    hashes[key] = now;
    result.push(alert);
  }

  updateState({ dedupHashes: hashes });
  return result;
}
