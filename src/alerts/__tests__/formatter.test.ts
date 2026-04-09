import { describe, it, expect } from 'vitest';
import { formatAlerts } from '../formatter.js';
import type { Alert } from '../../types.js';

describe('formatAlerts', () => {
  it('formats entity alert', () => {
    const alerts: Alert[] = [{
      type: 'entity',
      subtype: 'new',
      name: 'Test',
      score: 50,
      prevScore: 0,
      scoreDecimal: 0.5,
      position: 1,
      prevPosition: 0,
      publications: 10,
      firstviewed: '2025-01-01',
    }];

    const messages = formatAlerts(alerts);
    expect(messages).toHaveLength(1);
    expect(messages[0].blocks.length).toBeGreaterThan(0);
  });

  it('formats domain alert', () => {
    const alerts: Alert[] = [{
      type: 'domain',
      subtype: 'new',
      domain: 'marca.com',
      score: 50,
      prevScore: 0,
      position: 1,
      prevPosition: 0,
      publications: 20,
      prevPublications: 0,
    }];

    const messages = formatAlerts(alerts);
    expect(messages).toHaveLength(1);
    const text = JSON.stringify(messages[0].blocks);
    expect(text).toContain('marca.com');
  });

  it('formats social alert', () => {
    const alerts: Alert[] = [{
      type: 'social',
      subtype: 'spike',
      channel: 'twitter',
      score: 80,
      prevScore: 40,
      position: 1,
      prevPosition: 3,
      publications: 30,
      prevPublications: 15,
    }];

    const messages = formatAlerts(alerts);
    expect(messages).toHaveLength(1);
    const text = JSON.stringify(messages[0].blocks);
    expect(text).toContain('twitter');
  });

  it('batches alerts into groups of 5', () => {
    const alerts: Alert[] = Array.from({ length: 7 }, (_, i) => ({
      type: 'entity' as const,
      subtype: 'new' as const,
      name: `Entity ${i}`,
      score: 50,
      prevScore: 0,
      scoreDecimal: 0.5,
      position: 1,
      prevPosition: 0,
      publications: 10,
      firstviewed: '2025-01-01',
    }));

    const messages = formatAlerts(alerts);
    expect(messages).toHaveLength(2);
  });
});
