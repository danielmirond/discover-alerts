import { describe, it, expect, beforeEach, vi } from 'vitest';
import { detectHeadlinePatterns } from '../headline-patterns.js';
import type { DiscoverPage } from '../../types.js';

vi.mock('../../config.js', () => ({
  config: {
    thresholds: {
      headlineMinFrequency: 3,
    },
  },
}));

vi.mock('../../state/store.js', () => {
  let state = { headlinePatterns: {} };
  return {
    getState: () => state,
    updateState: (partial: any) => Object.assign(state, partial),
    __setState: (s: any) => { state = s; },
  };
});

import { __setState } from '../../state/store.js';

beforeEach(() => {
  (__setState as any)({ headlinePatterns: {} });
});

function makePage(title: string): DiscoverPage {
  return {
    url: `https://example.com/${encodeURIComponent(title)}`,
    title,
    title_original: title,
    title_english: '',
    image: '',
    snippet: '',
    publisher: '',
    domain: '',
    category: '',
    story_type: '',
    score: 50,
    score_decimal: 0.5,
    position: 1,
    publications: 1,
    firstviewed: '',
    lastviewed: '',
    is_new: false,
    is_video: false,
    is_webstory: false,
    entities: [],
    ai_overviews: [],
  };
}

describe('detectHeadlinePatterns', () => {
  it('detects recurring n-grams', () => {
    const pages = [
      makePage('Fichaje sorpresa del Barcelona en verano'),
      makePage('Fichaje sorpresa del Real Madrid confirmado'),
      makePage('Fichaje sorpresa del Atletico de Madrid'),
    ];

    const alerts = detectHeadlinePatterns(pages);
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    expect(alerts.some(a => a.ngram.includes('fichaje sorpresa'))).toBe(true);
  });

  it('ignores infrequent patterns', () => {
    const pages = [
      makePage('Una noticia unica sobre tecnologia'),
      makePage('Otra noticia diferente sobre politica'),
    ];

    const alerts = detectHeadlinePatterns(pages);
    expect(alerts).toHaveLength(0);
  });
});
