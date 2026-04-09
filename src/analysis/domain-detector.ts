import { config } from '../config.js';
import { getState, updateState } from '../state/store.js';
import type { DiscoverDomain, DomainAlert, DomainSnapshot } from '../types.js';

export function detectDomainAlerts(domains: DiscoverDomain[]): DomainAlert[] {
  const state = getState();
  const prev = state.domains;
  const alerts: DomainAlert[] = [];
  const now = new Date().toISOString();
  const next: Record<string, DomainSnapshot> = {};

  for (const d of domains) {
    next[d.domain] = {
      score: d.score,
      position: d.position,
      publications: d.publications,
      lastUpdated: now,
    };

    const old = prev[d.domain];

    if (!old) {
      // New domain appearing in Discover
      if (d.score >= config.thresholds.domainNewMinScore) {
        alerts.push({
          type: 'domain',
          subtype: 'new',
          domain: d.domain,
          score: d.score,
          prevScore: 0,
          position: d.position,
          prevPosition: 0,
          publications: d.publications,
          prevPublications: 0,
        });
      }
    } else {
      // Domain score spike
      const scoreDelta = d.score - old.score;
      const pubIncrease = old.publications > 0
        ? (d.publications - old.publications) / old.publications
        : 0;

      if (
        scoreDelta >= config.thresholds.domainScoreJump ||
        pubIncrease >= config.thresholds.domainPublicationsJumpPct
      ) {
        alerts.push({
          type: 'domain',
          subtype: 'spike',
          domain: d.domain,
          score: d.score,
          prevScore: old.score,
          position: d.position,
          prevPosition: old.position,
          publications: d.publications,
          prevPublications: old.publications,
        });
      }
    }
  }

  updateState({ domains: next });
  return alerts;
}
