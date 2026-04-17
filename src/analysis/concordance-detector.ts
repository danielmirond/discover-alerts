import { config } from '../config.js';
import { getState } from '../state/store.js';
import { extractContextSnippets } from './context-snippets.js';
import type {
  DiscoverEntity,
  DiscoverPage,
  EntityConcordanceAlert,
  TripleMatchAlert,
  MatchedTrend,
  MatchedXTrend,
  MatchedMediaArticle,
} from '../types.js';

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function diceCoefficient(a: string, b: string): number {
  const aN = normalize(a);
  const bN = normalize(b);
  if (aN === bN) return 1;
  if (aN.length < 2 || bN.length < 2) return 0;
  const bigramsA = new Set<string>();
  for (let i = 0; i < aN.length - 1; i++) bigramsA.add(aN.slice(i, i + 2));
  let intersection = 0;
  for (let i = 0; i < bN.length - 1; i++) {
    if (bigramsA.has(bN.slice(i, i + 2))) intersection++;
  }
  return (2 * intersection) / (bigramsA.size + (bN.length - 1));
}

interface ConcordanceMatch {
  trends: MatchedTrend[];
  xTrends: MatchedXTrend[];
  articles: MatchedMediaArticle[];
}

function findMatches(entityName: string, state: ReturnType<typeof getState>, fuzzy: number): ConcordanceMatch {
  const entityNorm = normalize(entityName);

  const trends: MatchedTrend[] = [];
  for (const [title, s] of Object.entries(state.trends)) {
    const tNorm = normalize(title);
    if (
      tNorm.includes(entityNorm) ||
      entityNorm.includes(tNorm) ||
      diceCoefficient(entityName, title) >= fuzzy
    ) {
      trends.push({ title, approxTraffic: s.approxTraffic });
    }
  }

  const xTrends: MatchedXTrend[] = [];
  for (const [topic, s] of Object.entries(state.xTrends)) {
    const tNorm = normalize(topic.replace(/^#/, ''));
    if (tNorm.length < 3) continue;
    if (
      tNorm.includes(entityNorm) ||
      entityNorm.includes(tNorm) ||
      diceCoefficient(entityName, topic) >= fuzzy
    ) {
      xTrends.push({
        topic,
        rank: s.rank,
        url: `https://getdaytrends.com/es/spain/trend/${encodeURIComponent(topic)}/`,
      });
    }
  }

  const articles: MatchedMediaArticle[] = [];
  for (const meta of Object.values(state.mediaArticles)) {
    if (!meta.title) continue;
    const titleNorm = normalize(meta.title);
    if (titleNorm.includes(entityNorm) && entityNorm.length > 3) {
      articles.push({
        feedName: meta.feedName,
        feedCategory: meta.feedCategory,
        title: meta.title,
        link: meta.link,
      });
      if (articles.length >= 5) break;
    }
  }

  return {
    trends: trends.slice(0, 3),
    xTrends: xTrends.slice(0, 3),
    articles,
  };
}

/**
 * Detects cross-source concordance: entities that appear in Discover AND
 * any combination of Google Trends, X/Twitter, and RSS media coverage.
 *
 * For each entity, emits at most ONE alert with the strongest subtype:
 *   discover_trends_x > discover_rss > discover_trends > discover_x
 *
 * Only considers top-N entities by score to avoid noise.
 */
export function detectConcordanceAlerts(
  entities: DiscoverEntity[],
  entityCategoryMap: Record<string, string> = {},
  entityTopicMap: Record<string, string> = {},
  pages: DiscoverPage[] = [],
): Array<EntityConcordanceAlert | TripleMatchAlert> {
  const state = getState();
  const fuzzy = config.thresholds.trendCorrelationMin;
  const alerts: Array<EntityConcordanceAlert | TripleMatchAlert> = [];

  // Limit to top N entities by score to reduce noise
  const topN = 100;
  const sortedEntities = [...entities].sort((a, b) => b.score - a.score).slice(0, topN);

  const tm = config.tripleMatch;

  for (const e of sortedEntities) {
    const matches = findMatches(e.entity, state, fuzzy);
    const hasTrends = matches.trends.length > 0;
    const hasX = matches.xTrends.length > 0;
    const hasRss = matches.articles.length > 0;

    // Triple Match check: Discover + Trends + X with hard thresholds.
    // When it fires, we skip the equivalent concordance alert to avoid duplicates.
    if (hasTrends && hasX) {
      const totalTraffic = matches.trends.reduce((sum, t) => sum + (t.approxTraffic || 0), 0);
      const bestXRank = Math.min(...matches.xTrends.map(t => t.rank));
      const passesTriple =
        e.position <= tm.maxDiscoverPosition &&
        totalTraffic >= tm.minTotalTraffic &&
        bestXRank <= tm.maxXRank;

      if (passesTriple) {
        alerts.push({
          type: 'triple_match',
          entityName: e.entity,
          category: entityCategoryMap[e.entity],
          topic: entityTopicMap[e.entity],
          score: e.score,
          position: e.position,
          publications: e.publications,
          totalTrafficEstimate: totalTraffic,
          bestXRank,
          outletCount: hasRss ? matches.articles.length : 0,
          matchingTrends: matches.trends,
          matchingXTrends: matches.xTrends,
          matchingArticles: matches.articles,
          contextSnippets: extractContextSnippets(e.entity, pages),
        });
        // Suppress the discover_trends_x concordance emission for this entity.
        continue;
      }
    }

    // Determine highest-priority subtype
    let subtype: EntityConcordanceAlert['subtype'] | null = null;
    if (hasTrends && hasX) {
      subtype = 'discover_trends_x';
    } else if (hasRss && (hasTrends || hasX)) {
      subtype = 'discover_rss';
    } else if (hasTrends) {
      subtype = 'discover_trends';
    } else if (hasX) {
      subtype = 'discover_x';
    } else if (hasRss) {
      subtype = 'discover_rss';
    }

    if (!subtype) continue;

    // Only emit if at least 2 sources (or 3+ media articles) to avoid single-source noise
    const sourceCount = (hasTrends ? 1 : 0) + (hasX ? 1 : 0) + (hasRss ? 1 : 0);
    if (sourceCount < 2 && !(hasRss && matches.articles.length >= 3)) continue;

    alerts.push({
      type: 'entity_concordance',
      subtype,
      entityName: e.entity,
      score: e.score,
      position: e.position,
      publications: e.publications,
      category: entityCategoryMap[e.entity],
      topic: entityTopicMap[e.entity],
      matchingTrends: matches.trends,
      matchingXTrends: matches.xTrends,
      matchingArticles: matches.articles,
      contextSnippets: extractContextSnippets(e.entity, pages),
    });
  }

  return alerts;
}
