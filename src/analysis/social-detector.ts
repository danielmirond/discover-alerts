import { config } from '../config.js';
import { getState, updateState } from '../state/store.js';
import { computeSpike } from './spike-helper.js';
import type { DiscoverSocial, SocialAlert, SocialSnapshot } from '../types.js';

export function detectSocialAlerts(social: DiscoverSocial[]): SocialAlert[] {
  const state = getState();
  const prev = state.social;
  const alerts: SocialAlert[] = [];
  const now = new Date().toISOString();
  const next: Record<string, SocialSnapshot> = {};

  const thresholds = {
    scoreJump: config.thresholds.socialScoreJump,
    newMinScore: config.thresholds.socialNewMinScore,
    publicationsJumpPct: config.thresholds.socialPublicationsJumpPct,
  };

  for (const s of social) {
    next[s.channel] = {
      score: s.score,
      position: s.position,
      publications: s.publications,
      lastUpdated: now,
    };

    const spike = computeSpike('social', s.channel, s, prev[s.channel], thresholds);
    if (spike) {
      alerts.push({
        type: 'social',
        subtype: spike.subtype,
        channel: spike.key,
        score: spike.score,
        prevScore: spike.prevScore,
        position: spike.position,
        prevPosition: spike.prevPosition,
        publications: spike.publications,
        prevPublications: spike.prevPublications,
      });
    }
  }

  updateState({ social: next });
  return alerts;
}
