import { config } from '../config.js';
import { getState, updateState } from '../state/store.js';
import { computeSpike } from './spike-helper.js';
import type { DiscoverDomain, DomainAlert, DomainSnapshot } from '../types.js';

export function detectDomainAlerts(domains: DiscoverDomain[]): DomainAlert[] {
  const state = getState();
  const prev = state.domains;
  const alerts: DomainAlert[] = [];
  const now = new Date().toISOString();
  const next: Record<string, DomainSnapshot> = {};

  const thresholds = {
    scoreJump: config.thresholds.domainScoreJump,
    newMinScore: config.thresholds.domainNewMinScore,
    publicationsJumpPct: config.thresholds.domainPublicationsJumpPct,
  };

  for (const d of domains) {
    next[d.domain] = {
      score: d.score,
      position: d.position,
      publications: d.publications,
      lastUpdated: now,
    };

    const spike = computeSpike('domain', d.domain, d, prev[d.domain], thresholds);
    if (spike) {
      alerts.push({
        type: 'domain',
        subtype: spike.subtype,
        domain: spike.key,
        score: spike.score,
        prevScore: spike.prevScore,
        position: spike.position,
        prevPosition: spike.prevPosition,
        publications: spike.publications,
        prevPublications: spike.prevPublications,
      });
    }
  }

  updateState({ domains: next });
  return alerts;
}
