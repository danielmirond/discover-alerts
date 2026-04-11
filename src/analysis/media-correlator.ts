import { getState, updateState } from '../state/store.js';
import { aggregateWeekly } from './weekly-aggregator.js';
import type {
  MediaArticle,
  DiscoverEntity,
  DiscoverPage,
  EntityCoverageAlert,
} from '../types.js';

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Groups all matching articles by entity. Produces ONE alert per entity
 * (not per article) listing all outlets and titles covering it.
 */
export function detectMediaDiscoverCorrelations(
  articles: MediaArticle[],
  entities: DiscoverEntity[],
  _pages: DiscoverPage[],
  entityCategoryMap: Record<string, string> = {},
): EntityCoverageAlert[] {
  const state = getState();
  const now = new Date().toISOString();
  const nowMs = Date.now();
  const retentionMs = 24 * 3600_000;

  // Start with pruned previous articles (older than 24h are dropped)
  const prevArticles = state.mediaArticles;
  const nextArticles: Record<string, {
    feedName: string;
    feedCategory: string;
    title: string;
    link: string;
    firstSeen: string;
  }> = {};
  for (const [key, meta] of Object.entries(prevArticles)) {
    if (nowMs - new Date(meta.firstSeen).getTime() <= retentionMs) {
      nextArticles[key] = meta;
    }
  }

  // Build entity-to-articles map (only new articles, based on entity substring match)
  type ArticleHit = { title: string; link: string; feedName: string; feedCategory: string };
  const entityArticles = new Map<string, ArticleHit[]>();
  const newArticlesForWeekly: MediaArticle[] = [];

  for (const article of articles) {
    if (!article.title) continue;
    const articleKey = article.link || article.title;

    // Update state regardless of match
    nextArticles[articleKey] = {
      feedName: article.feedName,
      feedCategory: article.feedCategory,
      title: article.title,
      link: article.link,
      firstSeen: prevArticles[articleKey]?.firstSeen ?? now,
    };

    // Only process new articles (not seen before)
    if (prevArticles[articleKey]) continue;

    newArticlesForWeekly.push(article);

    const articleTitleNorm = normalize(article.title);

    for (const entity of entities) {
      const entityNorm = normalize(entity.entity);
      if (entityNorm.length <= 3) continue;

      if (articleTitleNorm.includes(entityNorm)) {
        if (!entityArticles.has(entity.entity)) {
          entityArticles.set(entity.entity, []);
        }
        entityArticles.get(entity.entity)!.push({
          title: article.title,
          link: article.link,
          feedName: article.feedName,
          feedCategory: article.feedCategory,
        });
      }
    }
  }

  // Build one alert per entity with matches
  const alerts: EntityCoverageAlert[] = [];
  for (const [entityName, hits] of entityArticles) {
    if (hits.length === 0) continue;

    // Deduplicate outlet names
    const outlets = [...new Set(hits.map(h => h.feedName))];

    alerts.push({
      type: 'entity_coverage',
      entityName,
      coverageCount: hits.length,
      mediaOutlets: outlets,
      articles: hits.slice(0, 10),
      category: entityCategoryMap[entityName],
    });
  }

  updateState({ mediaArticles: nextArticles });

  // Aggregate NEW articles into the current week's bucket for the historical view
  // We pass a fresh state snapshot so aggregateWeekly sees up-to-date entities + map
  if (newArticlesForWeekly.length > 0) {
    aggregateWeekly(newArticlesForWeekly, getState());
  }

  return alerts;
}
