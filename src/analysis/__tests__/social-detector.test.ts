import { describe, it, expect, beforeEach, vi } from 'vitest';
import { detectSocialAlerts } from '../social-detector.js';
import type { DiscoverSocial } from '../../types.js';

vi.mock('../../config.js', () => ({
  config: {
    thresholds: {
      socialScoreJump: 20,
      socialNewMinScore: 10,
      socialPublicationsJumpPct: 0.5,
    },
  },
}));

vi.mock('../../state/store.js', () => {
  let state = { social: {} };
  return {
    getState: () => state,
    updateState: (partial: any) => Object.assign(state, partial),
    __setState: (s: any) => { state = s; },
  };
});

import { __setState } from '../../state/store.js';

beforeEach(() => {
  (__setState as any)({ social: {} });
});

function makeSocial(overrides: Partial<DiscoverSocial> = {}): DiscoverSocial {
  return {
    channel: 'twitter',
    score: 50,
    score_decimal: 0.5,
    position: 1,
    publications: 20,
    firstviewed: '2025-01-01',
    lastviewed: '2025-01-02',
    ...overrides,
  };
}

describe('detectSocialAlerts', () => {
  it('detects new social channels above min score', () => {
    const social = [makeSocial({ channel: 'instagram', score: 30 })];
    const alerts = detectSocialAlerts(social);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('social');
    expect(alerts[0].subtype).toBe('new');
    expect(alerts[0].channel).toBe('instagram');
  });

  it('ignores new social channels below min score', () => {
    const social = [makeSocial({ channel: 'mastodon', score: 5 })];
    const alerts = detectSocialAlerts(social);
    expect(alerts).toHaveLength(0);
  });

  it('detects social channel score spike', () => {
    (__setState as any)({
      social: {
        'twitter': { score: 20, position: 5, publications: 10, lastUpdated: '' },
      },
    });

    const social = [makeSocial({ score: 50 })];
    const alerts = detectSocialAlerts(social);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].subtype).toBe('spike');
    expect(alerts[0].prevScore).toBe(20);
  });

  it('detects social channel publication spike', () => {
    (__setState as any)({
      social: {
        'twitter': { score: 50, position: 1, publications: 10, lastUpdated: '' },
      },
    });

    const social = [makeSocial({ score: 52, publications: 20 })];
    const alerts = detectSocialAlerts(social);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].subtype).toBe('spike');
  });

  it('ignores stable channels', () => {
    (__setState as any)({
      social: {
        'twitter': { score: 48, position: 1, publications: 18, lastUpdated: '' },
      },
    });

    const social = [makeSocial({ score: 50, publications: 20 })];
    const alerts = detectSocialAlerts(social);
    expect(alerts).toHaveLength(0);
  });
});
