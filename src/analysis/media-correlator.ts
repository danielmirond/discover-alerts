import { config } from '../config.js';
import { getState, updateState } from '../state/store.js';
import { aggregateWeekly } from './weekly-aggregator.js';
import { extractContextSnippets } from './context-snippets.js';
import type {
  MediaArticle,
  DiscoverEntity,
  DiscoverPage,
  EntityCoverageAlert,
  MultiEntityArticleAlert,
  FirstMoverAlert,
  SchemaNewsMatchAlert,
} from '../types.js';
import { loadTopicsDictionary } from './topic-classifier.js';

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
export async function detectMediaDiscoverCorrelations(
  articles: MediaArticle[],
  entities: DiscoverEntity[],
  _pages: DiscoverPage[],
  entityCategoryMap: Record<string, string> = {},
  entityTopicMap: Record<string, string> = {},
): Promise<Array<EntityCoverageAlert | MultiEntityArticleAlert | FirstMoverAlert | SchemaNewsMatchAlert>> {
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
    description?: string;
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
      description: article.description || prevArticles[articleKey]?.description,
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
      // Derive majority category AND topic across entities
      const catCounts: Record<string, number> = {};
      const topicCounts: Record<string, number> = {};
      for (const ent of entitiesInArticle) {
        const cat = entityCategoryMap[ent];
        if (cat) catCounts[cat] = (catCounts[cat] || 0) + 1;
        const top = entityTopicMap[ent];
        if (top) topicCounts[top] = (topicCounts[top] || 0) + 1;
      }
      let majorityCat: string | undefined;
      let bestCat = 0;
      for (const [c, n] of Object.entries(catCounts)) {
        if (n > bestCat) { majorityCat = c; bestCat = n; }
      }
      let majorityTopic: string | undefined;
      let bestTopic = 0;
      for (const [t, n] of Object.entries(topicCounts)) {
        if (n > bestTopic) { majorityTopic = t; bestTopic = n; }
      }
      // El propio article.description ya es el mejor snippet para multi-entity
      const articleDesc = (article as any).description
        ? [ (article as any).description ].filter(Boolean)
        : undefined;
      multiEntityAlerts.push({
        type: 'multi_entity_article',
        articleTitle: article.title,
        articleLink: article.link,
        feedName: article.feedName,
        feedCategory: article.feedCategory,
        feedScope: article.feedScope,
        entities: entitiesInArticle.slice(0, 10),
        category: majorityCat,
        topic: majorityTopic,
        contextSnippets: articleDesc,
      });
    }
  }

  // Build one alert per entity with matches
  const alerts: Array<EntityCoverageAlert | MultiEntityArticleAlert | FirstMoverAlert | SchemaNewsMatchAlert> = [...multiEntityAlerts];

  // === SCHEMA NEWS MATCH ALERTS ===============================================
  // Para cada artículo NUEVO con match keyword schema (sucesos/legal) Y con
  // al menos 1 entidad Discover detectada → disparar alert al canal dedicado.
  try {
    const topicsDict = await loadTopicsDictionary();
    const scanTopics = topicsDict.topics.filter(t => t.id === 'sucesos' || t.id === 'legal');
    if (scanTopics.length > 0 && entityArticles.size > 0) {
      // Invertimos: por entidad, mirar cada artículo y ver si matchea schema
      for (const [entityName, hits] of entityArticles) {
        for (const h of hits) {
          const titleNorm = normalize(h.title || '');
          for (const topic of scanTopics) {
            const matched = (topic.keywords || []).filter(kw => titleNorm.includes(normalize(kw)));
            if (matched.length < (topic.minKeywords || 1)) continue;
            // Score/position desde DS entity si existe
            const dsEnt = entities.find(e => e.entity === entityName);
            alerts.push({
              type: 'schema_news_match',
              topic: topic.id,
              entityName,
              articleTitle: h.title,
              articleLink: h.link,
              feedName: h.feedName,
              feedCategory: h.feedCategory,
              keywords: matched.slice(0, 5),
              discoverScore: dsEnt?.score,
              discoverPosition: dsEnt?.position,
              category: entityCategoryMap[entityName],
            });
            break; // solo 1 topic por (entity, article)
          }
        }
      }
    }
  } catch (err) {
    console.warn('[media-correlator] schema news detector failed:', (err as Error).message);
  }
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
      topic: entityTopicMap[entityName],
      contextSnippets: extractContextSnippets(entityName),
    });
  }

  // First-mover detection: entidades Discover cubiertas por EXACTAMENTE 1 medio
  // en los ultimos 30 min. Señal de exclusiva competidora — o entramos YA o
  // decidimos saltarnos por falta de corroboracion.
  // Wire agencies (EFE, Europa Press, Reuters...): si son el único publisher,
  // la alerta se marca isWire=true y obtiene prioridad más alta en dispatch.
  const WIRE_FEED_PREFIXES = ['EFE', 'Europa Press', 'Reuters', 'AP'];
  const isWireFeed = (feedName: string) => WIRE_FEED_PREFIXES.some(p => feedName.startsWith(p));

  const firstMoverWindowMs = 30 * 60_000;
  for (const [entityName, hits] of entityArticles) {
    const recentHits = hits.filter(h => {
      const meta = Object.values(nextArticles).find(m => m.link === h.link);
      if (!meta) return false;
      const pubTs = meta.pubDate ? new Date(meta.pubDate).getTime() : NaN;
      const refTs = !isNaN(pubTs) ? pubTs : new Date(meta.firstSeen).getTime();
      return (nowMs - refTs) <= firstMoverWindowMs;
    });
    if (recentHits.length === 0) continue;
    const uniqueOutlets = new Set(recentHits.map(h => h.feedName));
    if (uniqueOutlets.size !== 1) continue;
    const solo = recentHits[0];
    const metaSolo = Object.values(nextArticles).find(m => m.link === solo.link);
    alerts.push({
      type: 'first_mover',
      entityName,
      feedName: solo.feedName,
      title: solo.title,
      link: solo.link,
      pubDate: metaSolo?.pubDate,
      windowMinutes: 30,
      category: entityCategoryMap[entityName],
      topic: entityTopicMap[entityName],
      isWire: isWireFeed(solo.feedName),
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
