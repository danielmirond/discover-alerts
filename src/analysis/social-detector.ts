import { config } from '../config.js';
import { getState, updateState } from '../state/store.js';
import type { DiscoverSocial, SocialAlert, SocialSnapshot } from '../types.js';

export function detectSocialAlerts(social: DiscoverSocial[]): SocialAlert[] {
  const state = getState();
  const prev = state.social;
  const alerts: SocialAlert[] = [];
  const now = new Date().toISOString();
  const next: Record<string, SocialSnapshot> = {};

  for (const s of social) {
    next[s.channel] = {
      score: s.score,
      position: s.position,
      publications: s.publications,
      lastUpdated: now,
    };

    const old = prev[s.channel];

    if (!old) {
      // New social channel appearing
      if (s.score >= config.thresholds.socialNewMinScore) {
        alerts.push({
          type: 'social',
          subtype: 'new',
          channel: s.channel,
          score: s.score,
          prevScore: 0,
          position: s.position,
          prevPosition: 0,
          publications: s.publications,
          prevPublications: 0,
        });
      }
    } else {
      // Social channel spike
      const scoreDelta = s.score - old.score;
      const pubIncrease = old.publications > 0
        ? (s.publications - old.publications) / old.publications
        : 0;

      if (
        scoreDelta >= config.thresholds.socialScoreJump ||
        pubIncrease >= config.thresholds.socialPublicationsJumpPct
      ) {
        alerts.push({
          type: 'social',
          subtype: 'spike',
          channel: s.channel,
          score: s.score,
          prevScore: old.score,
          position: s.position,
          prevPosition: old.position,
          publications: s.publications,
          prevPublications: old.publications,
        });
      }
    }
  }

  updateState({ social: next });
  return alerts;
}
