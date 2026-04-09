import { describe, it, expect, beforeEach, vi } from 'vitest';
import { detectDomainAlerts } from '../domain-detector.js';
import type { DiscoverDomain } from '../../types.js';

vi.mock('../../config.js', () => ({
  config: {
    thresholds: {
      domainScoreJump: 20,
      domainNewMinScore: 10,
      domainPublicationsJumpPct: 0.5,
    },
  },
}));

vi.mock('../../state/store.js', () => {
  let state = { domains: {} };
  return {
    getState: () => state,
    updateState: (partial: any) => Object.assign(state, partial),
    __setState: (s: any) => { state = s; },
  };
});

import { __setState } from '../../state/store.js';

beforeEach(() => {
  (__setState as any)({ domains: {} });
});

function makeDomain(overrides: Partial<DiscoverDomain> = {}): DiscoverDomain {
  return {
    domain: 'example.com',
    score: 50,
    score_decimal: 0.5,
    position: 1,
    publications: 20,
    firstviewed: '2025-01-01',
    lastviewed: '2025-01-02',
    ...overrides,
  };
}

describe('detectDomainAlerts', () => {
  it('detects new domains above min score', () => {
    const domains = [makeDomain({ domain: 'marca.com', score: 30 })];
    const alerts = detectDomainAlerts(domains);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('domain');
    expect(alerts[0].subtype).toBe('new');
    expect(alerts[0].domain).toBe('marca.com');
  });

  it('ignores new domains below min score', () => {
    const domains = [makeDomain({ domain: 'small.com', score: 5 })];
    const alerts = detectDomainAlerts(domains);
    expect(alerts).toHaveLength(0);
  });

  it('detects domain score spike', () => {
    (__setState as any)({
      domains: {
        'example.com': { score: 20, position: 5, publications: 10, lastUpdated: '' },
      },
    });

    const domains = [makeDomain({ score: 50 })];
    const alerts = detectDomainAlerts(domains);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].subtype).toBe('spike');
    expect(alerts[0].prevScore).toBe(20);
  });

  it('detects domain publication spike', () => {
    (__setState as any)({
      domains: {
        'example.com': { score: 50, position: 1, publications: 10, lastUpdated: '' },
      },
    });

    const domains = [makeDomain({ score: 52, publications: 20 })];
    const alerts = detectDomainAlerts(domains);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].subtype).toBe('spike');
  });

  it('ignores stable domains', () => {
    (__setState as any)({
      domains: {
        'example.com': { score: 48, position: 1, publications: 18, lastUpdated: '' },
      },
    });

    const domains = [makeDomain({ score: 50, publications: 20 })];
    const alerts = detectDomainAlerts(domains);
    expect(alerts).toHaveLength(0);
  });
});
