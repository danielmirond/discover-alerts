import { describe, it, expect, beforeEach, vi } from 'vitest';
import { detectCategoryAlerts } from '../category-detector.js';
import type { DiscoverCategory } from '../../types.js';

vi.mock('../../config.js', () => ({
  config: {
    thresholds: {
      categoryScoreJump: 15,
      categoryPublicationsJumpPct: 0.5,
    },
  },
}));

vi.mock('../../state/store.js', () => {
  let state = { categories: {} };
  return {
    getState: () => state,
    updateState: (partial: any) => Object.assign(state, partial),
    __setState: (s: any) => { state = s; },
  };
});

import { __setState } from '../../state/store.js';

beforeEach(() => {
  (__setState as any)({ categories: {} });
});

function makeCat(overrides: Partial<DiscoverCategory> = {}): DiscoverCategory {
  return {
    id: 1,
    name: 'Deportes',
    score: 50,
    score_decimal: 0.5,
    position: 1,
    publications: 20,
    firstviewed: '2025-01-01',
    lastviewed: '2025-01-02',
    ...overrides,
  };
}

describe('detectCategoryAlerts', () => {
  it('skips categories not previously seen', () => {
    const cats = [makeCat()];
    const alerts = detectCategoryAlerts(cats);
    expect(alerts).toHaveLength(0);
  });

  it('detects category score spike', () => {
    (__setState as any)({
      categories: {
        1: { name: 'Deportes', score: 30, scoreDecimal: 0.3, position: 3, publications: 20, lastUpdated: '' },
      },
    });

    const cats = [makeCat({ score: 50 })];
    const alerts = detectCategoryAlerts(cats);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('category');
    expect(alerts[0].subtype).toBe('spike');
    expect(alerts[0].prevScore).toBe(30);
  });

  it('detects category publication spike', () => {
    (__setState as any)({
      categories: {
        1: { name: 'Deportes', score: 50, scoreDecimal: 0.5, position: 1, publications: 10, lastUpdated: '' },
      },
    });

    const cats = [makeCat({ score: 52, publications: 20 })];
    const alerts = detectCategoryAlerts(cats);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].publications).toBe(20);
    expect(alerts[0].prevPublications).toBe(10);
  });

  it('ignores stable categories', () => {
    (__setState as any)({
      categories: {
        1: { name: 'Deportes', score: 48, scoreDecimal: 0.48, position: 1, publications: 18, lastUpdated: '' },
      },
    });

    const cats = [makeCat({ score: 50, publications: 20 })];
    const alerts = detectCategoryAlerts(cats);
    expect(alerts).toHaveLength(0);
  });
});
