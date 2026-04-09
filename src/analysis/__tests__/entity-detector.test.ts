import { describe, it, expect, beforeEach, vi } from 'vitest';
import { detectEntityAlerts } from '../entity-detector.js';
import type { DiscoverEntity } from '../../types.js';

vi.mock('../../config.js', () => ({
  config: {
    thresholds: {
      entityScoreJump: 20,
      entityNewMinScore: 10,
    },
  },
}));

vi.mock('../../state/store.js', () => {
  let state = { entities: {} };
  return {
    getState: () => state,
    updateState: (partial: any) => Object.assign(state, partial),
    __setState: (s: any) => { state = s; },
  };
});

import { __setState } from '../../state/store.js';

beforeEach(() => {
  ((__setState as any))({ entities: {} });
});

function makeEntity(overrides: Partial<DiscoverEntity> = {}): DiscoverEntity {
  return {
    name: 'Test Entity',
    score: 50,
    score_decimal: 0.5,
    position: 1,
    publications: 10,
    firstviewed: '2025-01-01',
    lastviewed: '2025-01-02',
    ...overrides,
  };
}

describe('detectEntityAlerts', () => {
  it('detects new entities above min score', () => {
    const entities = [makeEntity({ name: 'New Entity', score: 30 })];
    const alerts = detectEntityAlerts(entities);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('entity');
    expect(alerts[0].subtype).toBe('new');
    expect(alerts[0].name).toBe('New Entity');
  });

  it('ignores new entities below min score', () => {
    const entities = [makeEntity({ name: 'Low Entity', score: 5 })];
    const alerts = detectEntityAlerts(entities);

    expect(alerts).toHaveLength(0);
  });

  it('detects rising entities', () => {
    (__setState as any)({
      entities: {
        'Existing Entity': {
          score: 20,
          scoreDecimal: 0.2,
          position: 10,
          publications: 5,
          firstSeen: '2025-01-01',
          lastUpdated: '2025-01-01',
        },
      },
    });

    const entities = [makeEntity({ name: 'Existing Entity', score: 50 })];
    const alerts = detectEntityAlerts(entities);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].subtype).toBe('rising');
    expect(alerts[0].prevScore).toBe(20);
  });

  it('ignores entities without significant score change', () => {
    (__setState as any)({
      entities: {
        'Stable Entity': {
          score: 45,
          scoreDecimal: 0.45,
          position: 3,
          publications: 10,
          firstSeen: '2025-01-01',
          lastUpdated: '2025-01-01',
        },
      },
    });

    const entities = [makeEntity({ name: 'Stable Entity', score: 50 })];
    const alerts = detectEntityAlerts(entities);

    expect(alerts).toHaveLength(0);
  });
});
