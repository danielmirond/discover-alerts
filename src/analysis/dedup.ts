import { config } from '../config.js';
import { getState, updateState } from '../state/store.js';
import type { Alert } from '../types.js';

function alertKey(alert: Alert) {
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
    case 'boe_discover_correlation':
      return `boe:${alert.boeId || alert.boeTitle}`;
    case 'entity_coverage':
      return `entity_coverage:${alert.entityName}`;
    case 'entity_concordance':
      return `concordance:${alert.subtype}:${alert.entityName}`;
    case 'triple_match':
      return `triple_match:${alert.entityName}`;
    case 'own_media':
      return `own_media:${alert.subtype}:${alert.url || alert.title}`;
    case 'own_media_absent':
      return `own_media_absent:${alert.entityName}`;
    case 'trends_without_discover':
      return `trends_gap:${alert.trendTitle}`;
    case 'headline_cluster':
      return `cluster:${alert.entitiesInCluster.slice(0, 3).sort().join(',')}`;
    case 'stale_data':
      return `stale:${alert.source}`;
    case 'multi_entity_article':
      return `multi_entity:${alert.articleLink || alert.articleTitle}`;
    case 'meneame_hot':
      return `meneame:${alert.storyUrl || alert.title}`;
    case 'wikipedia_surge':
      return `wiki:${alert.title}`;
    case 'first_mover':
      return `first_mover:${alert.entityName}:${alert.feedName}`;
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
    const key = alertKey(alert) ?? '';
    if (!key) { result.push(alert); continue; }
    if (hashes[key] && now - hashes[key] < windowMs) continue;
    hashes[key] = now;
    result.push(alert);
  }

  updateState({ dedupHashes: hashes });
  return result;
}
