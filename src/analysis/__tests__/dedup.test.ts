import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dedup } from '../dedup.js';
import type { Alert, EntityAlert } from '../../types.js';

vi.mock('../../config.js', () => ({
  config: {
    dedup: { windowHours: 6 },
  },
}));

vi.mock('../../state/store.js', () => {
  let state = { dedupHashes: {} };
  return {
    getState: () => state,
    updateState: (partial: any) => Object.assign(state, partial),
    __setState: (s: any) => { state = s; },
  };
});

import { __setState } from '../../state/store.js';

beforeEach(() => {
  (__setState as any)({ dedupHashes: {} });
});

function makeEntityAlert(name: string): EntityAlert {
  return {
    type: 'entity',
    subtype: 'new',
    name,
    score: 50,
    prevScore: 0,
    scoreDecimal: 0.5,
    position: 1,
    prevPosition: 0,
    publications: 10,
    firstviewed: '2025-01-01',
  };
}

describe('dedup', () => {
  it('lets through new alerts', () => {
    const alerts: Alert[] = [makeEntityAlert('A'), makeEntityAlert('B')];
    const result = dedup(alerts);
    expect(result).toHaveLength(2);
  });

  it('filters duplicate alerts within window', () => {
    const alerts: Alert[] = [makeEntityAlert('A')];
    dedup(alerts); // first time
    const result = dedup(alerts); // second time
    expect(result).toHaveLength(0);
  });

  it('allows alerts after window expires', () => {
    const now = Date.now();
    (__setState as any)({
      dedupHashes: {
        'entity:A': now - 7 * 3600_000, // 7 hours ago, outside 6h window
      },
    });

    const alerts: Alert[] = [makeEntityAlert('A')];
    const result = dedup(alerts);
    expect(result).toHaveLength(1);
  });

  it('handles different alert types independently', () => {
    const alerts: Alert[] = [
      makeEntityAlert('A'),
      { type: 'domain', subtype: 'new', domain: 'A', score: 50, prevScore: 0, position: 1, prevPosition: 0, publications: 10, prevPublications: 0 },
    ];
    const result = dedup(alerts);
    expect(result).toHaveLength(2);
  });
});
