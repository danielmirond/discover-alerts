import { config } from '../config.js';
import { getState, updateState } from '../state/store.js';
import { aggregateWeekly } from './weekly-aggregator.js';
import type {
  MediaArticle,
  DiscoverEntity,
  DiscoverPage,
  EntityCoverageAlert,
  MultiEntityArticleAlert,
} from '../types.js';

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Returns how old (in ms) an article is, using pubDate if parseable,
 * otherwise falling back to `now` (i.e. treat it as fresh).
 */
function articleAgeMs(pubDate: string | undefined, now: string): number {
  if (!pubDate) return 0;
  const ts = new Date(pubDate).getTime();
  if (isNaN(ts)) return 0;
  return new Date(now).getTime() - ts;
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
): Array<EntityCoverageAlert | MultiEntityArticleAlert> {
  const state = getState();
  const now = new Date().toISOString();
  const nowMs = Date.now();
  // Cache retention matches the alert age window — no sense keeping articles
  // older than what we'd ever surface.
  const retentionMs = config.thresholds.mediaMaxAgeHours * 3600_000;

  // Start with pruned previous articles (older than 24h are dropped)
  const prevArticles = state.mediaArticles;
  const nextArticles: Record<string, {
    feedName: string;
    feedCategory: string;
    feedScope?: 'nacional' | 'internacional';
    title: string;
    link: string;
    firstSeen: string;
    pubDate?: string;
  }> = {};
  for (const [key, meta] of Object.entries(prevArticles)) {
    if (nowMs - new Date(meta.firstSeen).getTime() <= retentionMs) {
      nextArticles[key] = meta;
    }
  }

  // Build entity-to-articles map (only new articles, based on entity substring match)
  type ArticleHit = { title: string; link: string; feedName: string; feedCategory: string; feedScope?: 'nacional' | 'internacional' };
  const entityArticles = new Map<string, ArticleHit[]>();
  const newArticlesForWeekly: MediaArticle[] = [];
  const multiEntityAlerts: MultiEntityArticleAlert[] = [];
  const multiEntityMin = config.thresholds.multiEntityArticleMin;
  const maxAgeMs = config.thresholds.mediaMaxAgeHours * 3600_000;

  for (const article of articles) {
    if (!article.title) continue;
    const articleKey = article.link || article.title;

    // Update state regardless of match
    nextArticles[articleKey] = {
      feedName: article.feedName,
      feedCategory: article.feedCategory,
      feedScope: article.feedScope,
      title: article.title,
      link: article.link,
      firstSeen: prevArticles[articleKey]?.firstSeen ?? now,
      pubDate: article.pubDate || prevArticles[articleKey]?.pubDate,
    };

    // Only process new articles (not seen before)
    if (prevArticles[articleKey]) continue;

    // Skip articles older than the max age window (uses pubDate if valid, else firstSeen)
    const articleTime = articleAgeMs(article.pubDate, now);
    if (articleTime > maxAgeMs) continue;

    newArticlesForWeekly.push(article);

    const articleTitleNorm = normalize(article.title);
    const entitiesInArticle: string[] = [];

    for (const entity of entities) {
      const entityNorm = normalize(entity.entity);
      if (entityNorm.length <= 3) continue;

      if (articleTitleNorm.includes(entityNorm)) {
        entitiesInArticle.push(entity.entity);
        if (!entityArticles.has(entity.entity)) {
          entityArticles.set(entity.entity, []);
        }
        entityArticles.get(entity.entity)!.push({
          title: article.title,
          link: article.link,
          feedName: article.feedName,
          feedCategory: article.feedCategory,
          feedScope: article.feedScope,
        });
      }
    }

    // Multi-entity article detection
    if (entitiesInArticle.length >= multiEntityMin) {
      // Derive majority category across entities
      const catCounts: Record<string, number> = {};
      for (const ent of entitiesInArticle) {
        const cat = entityCategoryMap[ent];
        if (cat) catCounts[cat] = (catCounts[cat] || 0) + 1;
      }
      let majorityCat: string | undefined;
      let best = 0;
      for (const [c, n] of Object.entries(catCounts)) {
        if (n > best) { majorityCat = c; best = n; }
      }
      multiEntityAlerts.push({
        type: 'multi_entity_article',
        articleTitle: article.title,
        articleLink: article.link,
        feedName: article.feedName,
        feedCategory: article.feedCategory,
        feedScope: article.feedScope,
        entities: entitiesInArticle.slice(0, 10),
        category: majorityCat,
      });
    }
  }

  // Build one alert per entity with matches
  const alerts: Array<EntityCoverageAlert | MultiEntityArticleAlert> = [...multiEntityAlerts];
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
