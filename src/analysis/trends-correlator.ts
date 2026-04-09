import { config } from '../config.js';
import { getState, updateState } from '../state/store.js';
import type {
  TrendsItem,
  DiscoverEntity,
  DiscoverPage,
  TrendsCorrelationAlert,
  TrendsNewTopicAlert,
  TrendSnapshot,
} from '../types.js';

// Dice coefficient on character bigrams for fuzzy matching
function diceCoefficient(a: string, b: string): number {
  const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const aN = norm(a);
  const bN = norm(b);

  if (aN === bN) return 1;
  if (aN.length < 2 || bN.length < 2) return 0;

  const bigramsA = new Set<string>();
  for (let i = 0; i < aN.length - 1; i++) bigramsA.add(aN.slice(i, i + 2));

  let intersection = 0;
  const bigramsBSize = bN.length - 1;
  for (let i = 0; i < bN.length - 1; i++) {
    if (bigramsA.has(bN.slice(i, i + 2))) intersection++;
  }

  return (2 * intersection) / (bigramsA.size + bigramsBSize);
}

export function detectTrendsCorrelations(
  trends: TrendsItem[],
  entities: DiscoverEntity[],
  pages: DiscoverPage[],
): TrendsCorrelationAlert[] {
  const alerts: TrendsCorrelationAlert[] = [];
  const threshold = config.thresholds.trendCorrelationMin;

  for (const trend of trends) {
    const matchingEntities: string[] = [];
    const matchingPageTitles: string[] = [];
    let bestScore = 0;

    for (const entity of entities) {
      const sim = diceCoefficient(trend.title, entity.name);
      if (sim >= threshold) {
        matchingEntities.push(entity.name);
        bestScore = Math.max(bestScore, sim);
      }
    }

    for (const page of pages) {
      const title = page.title || page.title_original || '';
      const titleNorm = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const trendNorm = trend.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      if (titleNorm.includes(trendNorm) || diceCoefficient(trend.title, title) >= threshold) {
        matchingPageTitles.push(title);
        bestScore = Math.max(bestScore, diceCoefficient(trend.title, title));
      }
    }

    if (matchingEntities.length > 0 || matchingPageTitles.length > 0) {
      alerts.push({
        type: 'trends_correlation',
        trendTitle: trend.title,
        approxTraffic: trend.approxTraffic,
        matchingEntities,
        matchingPageTitles: matchingPageTitles.slice(0, 5),
        similarityScore: bestScore,
      });
    }
  }

  return alerts;
}

export function detectNewTrends(trends: TrendsItem[]): TrendsNewTopicAlert[] {
  const state = getState();
  const prev = state.trends;
  const alerts: TrendsNewTopicAlert[] = [];
  const now = new Date().toISOString();
  const next: Record<string, TrendSnapshot> = {};

  for (const t of trends) {
    next[t.title] = {
      approxTraffic: t.approxTraffic,
      firstSeen: prev[t.title]?.firstSeen ?? now,
      lastUpdated: now,
    };

    if (!prev[t.title]) {
      alerts.push({
        type: 'trends_new_topic',
        title: t.title,
        approxTraffic: t.approxTraffic,
        newsItems: t.newsItems.slice(0, 3),
      });
    }
  }

  updateState({ trends: next });
  return alerts;
}
