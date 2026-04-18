import { config } from '../config.js';
import { getState, updateState } from '../state/store.js';
import { diceCoefficient, normalize } from '../utils/string-similarity.js';
import type {
  MediaArticle,
  DiscoverEntity,
  DiscoverPage,
  MediaDiscoverCorrelationAlert,
} from '../types.js';

export function detectMediaDiscoverCorrelations(
  articles: MediaArticle[],
  entities: DiscoverEntity[],
  pages: DiscoverPage[],
): MediaDiscoverCorrelationAlert[] {
  const state = getState();
  const threshold = config.thresholds.trendCorrelationMin;
  const alerts: MediaDiscoverCorrelationAlert[] = [];
  const now = new Date().toISOString();

  // Track seen articles to avoid re-alerting
  const prevArticles = state.mediaArticles;
  const nextArticles: Record<string, { feedName: string; firstSeen: string }> = {};

  for (const article of articles) {
    if (!article.title) continue;

    const articleKey = article.link || article.title;
    nextArticles[articleKey] = {
      feedName: article.feedName,
      firstSeen: prevArticles[articleKey]?.firstSeen ?? now,
    };

    // Skip articles we've already seen
    if (prevArticles[articleKey]) continue;

    const matchingEntities: string[] = [];
    const matchingPageTitles: string[] = [];
    let bestScore = 0;

    // Check against Discover entities
    for (const entity of entities) {
      const articleNorm = normalize(article.title);
      const entityNorm = normalize(entity.name);

      // Substring match: entity name appears in article title
      if (articleNorm.includes(entityNorm) && entityNorm.length > 3) {
        matchingEntities.push(entity.name);
        bestScore = Math.max(bestScore, 0.9);
        continue;
      }

      // Fuzzy match
      const sim = diceCoefficient(article.title, entity.name);
      if (sim >= threshold) {
        matchingEntities.push(entity.name);
        bestScore = Math.max(bestScore, sim);
      }
    }

    // Check against Discover pages
    for (const page of pages) {
      const pageTitle = page.title || page.title_original || '';
      if (!pageTitle) continue;

      const sim = diceCoefficient(article.title, pageTitle);
      if (sim >= threshold) {
        matchingPageTitles.push(pageTitle);
        bestScore = Math.max(bestScore, sim);
      }
    }

    if (matchingEntities.length > 0 || matchingPageTitles.length > 0) {
      alerts.push({
        type: 'media_discover_correlation',
        articleTitle: article.title,
        articleLink: article.link,
        feedName: article.feedName,
        feedCategory: article.feedCategory,
        matchingEntities,
        matchingPageTitles: matchingPageTitles.slice(0, 5),
        similarityScore: bestScore,
      });
    }
  }

  updateState({ mediaArticles: nextArticles });
  return alerts;
}
