import { config } from '../config.js';
import { getState, updateState } from '../state/store.js';
import type {
  DiscoverEntity,
  DiscoverPage,
  EntityAlert,
  EntitySnapshot,
  MatchedTrend,
  MatchedXTrend,
  MatchedMediaArticle,
} from '../types.js';

/**
 * Builds a map of entity name -> most frequent category based on
 * DiscoverPages that mention each entity. Uses majority vote.
 */
function buildEntityCategoryMap(
  pages: DiscoverPage[],
  categoryNames: Record<number, string>,
): Record<string, string> {
  const counts: Record<string, Record<string, number>> = {};

  for (const page of pages) {
    if (!page.entities || page.entities.length === 0) continue;

    // Resolve category name (page.category can be a name string or numeric id)
    let categoryName: string | undefined;
    if (typeof page.category === 'number') {
      categoryName = categoryNames[page.category];
    } else if (typeof page.category === 'string' && page.category.trim()) {
      categoryName = page.category;
    }
    if (!categoryName) continue;

    for (const entityName of page.entities) {
      if (!counts[entityName]) counts[entityName] = {};
      counts[entityName][categoryName] = (counts[entityName][categoryName] ?? 0) + 1;
    }
  }

  const result: Record<string, string> = {};
  for (const [entityName, catCounts] of Object.entries(counts)) {
    let bestCat = '';
    let bestCount = 0;
    for (const [cat, count] of Object.entries(catCounts)) {
      if (count > bestCount) {
        bestCat = cat;
        bestCount = count;
      }
    }
    if (bestCat) result[entityName] = bestCat;
  }
  return result;
}

// Dice coefficient for fuzzy matching
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

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Enriches an ascending/spike entity with matching Google Trends topics
 * and matching media articles (from cached state).
 */
function enrichAscending(
  entityName: string,
  state: ReturnType<typeof getState>,
  fuzzyThreshold: number,
): {
  matchingTrends: MatchedTrend[];
  matchingXTrends: MatchedXTrend[];
  matchingArticles: MatchedMediaArticle[];
} {
  const entityNorm = normalize(entityName);

  // Match against cached Google Trends topics
  const matchingTrends: MatchedTrend[] = [];
  for (const [trendTitle, snap] of Object.entries(state.trends)) {
    const trendNorm = normalize(trendTitle);
    if (
      trendNorm.includes(entityNorm) ||
      entityNorm.includes(trendNorm) ||
      diceCoefficient(entityName, trendTitle) >= fuzzyThreshold
    ) {
      matchingTrends.push({ title: trendTitle, approxTraffic: snap.approxTraffic });
    }
  }

  // Match against cached X/Twitter trends
  const matchingXTrends: MatchedXTrend[] = [];
  for (const [topic, snap] of Object.entries(state.xTrends)) {
    const topicNorm = normalize(topic.replace(/^#/, ''));
    if (topicNorm.length < 3) continue;
    if (
      topicNorm.includes(entityNorm) ||
      entityNorm.includes(topicNorm) ||
      diceCoefficient(entityName, topic) >= fuzzyThreshold
    ) {
      // Rebuild URL if lost (state only keeps rank)
      matchingXTrends.push({
        topic,
        rank: snap.rank,
        url: `https://getdaytrends.com/es/spain/trend/${encodeURIComponent(topic)}/`,
      });
    }
  }

  // Match against cached media articles (substring on title)
  const matchingArticles: MatchedMediaArticle[] = [];
  for (const meta of Object.values(state.mediaArticles)) {
    if (!meta.title) continue;
    const titleNorm = normalize(meta.title);
    if (titleNorm.includes(entityNorm) && entityNorm.length > 3) {
      matchingArticles.push({
        feedName: meta.feedName,
        feedCategory: meta.feedCategory,
        title: meta.title,
        link: meta.link,
      });
    }
  }

  return {
    matchingTrends: matchingTrends.slice(0, 3),
    matchingXTrends: matchingXTrends.slice(0, 3),
    matchingArticles: matchingArticles.slice(0, 5),
  };
}

export function detectEntityAlerts(
  entities: DiscoverEntity[],
  pages: DiscoverPage[] = [],
  categoryNames: Record<number, string> = {},
): EntityAlert[] {
  const state = getState();
  const prev = state.entities;
  const alerts: EntityAlert[] = [];
  const now = new Date().toISOString();
  const nowMs = Date.now();
  const next: Record<string, EntitySnapshot> = {};

  // Derive category for each entity from pages that mention it
  const entityCategoryMap = buildEntityCategoryMap(pages, categoryNames);

  const ascendingMin = config.thresholds.entityAscendingMinAppearances;
  const ascendingWindowMs = config.thresholds.entityAscendingWindowHours * 3600_000;
  const spikeMin = config.thresholds.entitySpikeMinAppearances;
  const spikeWindowMs = config.thresholds.entitySpikeWindowHours * 3600_000;
  const flashMin = config.thresholds.entityFlashMinAppearances;
  const flashWindowMs = config.thresholds.entityFlashWindowHours * 3600_000;
  const fuzzyThreshold = config.thresholds.trendCorrelationMin;

  const countInWindow = (timestamps: string[], windowMs: number): number =>
    timestamps.filter(ts => nowMs - new Date(ts).getTime() <= windowMs).length;

  // Preserve old entities that weren't in this poll but still have recent appearances.
  // Without this, an entity that appears in poll #1 and #3 but not #2 would lose its
  // history, breaking the flash/spike/ascending detection for intermittent entities.
  const currentEntitySet = new Set(entities.map(e => e.entity));
  for (const [name, oldSnap] of Object.entries(prev)) {
    if (currentEntitySet.has(name)) continue;
    const prunedAppearances = (oldSnap.appearances ?? []).filter(
      ts => nowMs - new Date(ts).getTime() <= ascendingWindowMs,
    );
    // Drop entities whose appearances all expired
    if (prunedAppearances.length === 0) continue;
    next[name] = { ...oldSnap, appearances: prunedAppearances };
  }

  for (const e of entities) {
    const old = prev[e.entity];
    const prevAppearances = old?.appearances ?? [];
    const entityCategory = entityCategoryMap[e.entity];

    // Prune appearances outside the longest window we care about (ascending)
    const appearances = [
      ...prevAppearances.filter(ts => nowMs - new Date(ts).getTime() <= ascendingWindowMs),
      now,
    ];

    next[e.entity] = {
      score: e.score,
      scoreDecimal: e.score_decimal,
      position: e.position,
      publications: e.publications,
      firstSeen: old?.firstSeen ?? now,
      lastUpdated: now,
      appearances,
    };

    if (!old) {
      // New entity: just seed state, do NOT emit an alert.
      // "new" alerts were too noisy (700+ per poll with lines=1000).
      // The entity will trigger a spike/flash/ascending alert once it
      // accumulates enough appearances, which is far more signal.
      continue;
    }

    // Rising (score jump) — independent of appearances
    const scoreDelta = e.score - old.score;
    if (scoreDelta >= config.thresholds.entityScoreJump) {
      alerts.push({
        type: 'entity',
        subtype: 'rising',
        name: e.entity,
        score: e.score,
        prevScore: old.score,
        scoreDecimal: e.score_decimal,
        position: e.position,
        prevPosition: old.position,
        publications: e.publications,
        firstviewed: old.firstSeen,
        category: entityCategory,
      });
    }

    // Flash check (strictest window = highest priority)
    const prevFlashCount = countInWindow(prevAppearances, flashWindowMs);
    const currFlashCount = countInWindow(appearances, flashWindowMs);
    const flashJustCrossed = prevFlashCount < flashMin && currFlashCount >= flashMin;

    if (flashJustCrossed) {
      const enrichment = enrichAscending(e.entity, state, fuzzyThreshold);
      alerts.push({
        type: 'entity',
        subtype: 'flash',
        name: e.entity,
        score: e.score,
        prevScore: old.score,
        scoreDecimal: e.score_decimal,
        position: e.position,
        prevPosition: old.position,
        publications: e.publications,
        firstviewed: old.firstSeen,
        appearanceCount: currFlashCount,
        windowHours: config.thresholds.entityFlashWindowHours,
        category: entityCategory,
        ...enrichment,
      });
      continue; // flash takes precedence — don't also fire spike or ascending
    }

    // Spike check (priority over ascending)
    const prevSpikeCount = countInWindow(prevAppearances, spikeWindowMs);
    const currSpikeCount = countInWindow(appearances, spikeWindowMs);
    const spikeJustCrossed = prevSpikeCount < spikeMin && currSpikeCount >= spikeMin;

    if (spikeJustCrossed) {
      const enrichment = enrichAscending(e.entity, state, fuzzyThreshold);
      alerts.push({
        type: 'entity',
        subtype: 'spike',
        name: e.entity,
        score: e.score,
        prevScore: old.score,
        scoreDecimal: e.score_decimal,
        position: e.position,
        prevPosition: old.position,
        publications: e.publications,
        firstviewed: old.firstSeen,
        appearanceCount: currSpikeCount,
        windowHours: config.thresholds.entitySpikeWindowHours,
        category: entityCategory,
        ...enrichment,
      });
      continue; // spike takes precedence — don't also fire ascending
    }

    // Ascending check (wider window)
    const prevAscCount = countInWindow(prevAppearances, ascendingWindowMs);
    const currAscCount = countInWindow(appearances, ascendingWindowMs);
    if (prevAscCount < ascendingMin && currAscCount >= ascendingMin) {
      const enrichment = enrichAscending(e.entity, state, fuzzyThreshold);
      alerts.push({
        type: 'entity',
        subtype: 'ascending',
        name: e.entity,
        score: e.score,
        prevScore: old.score,
        scoreDecimal: e.score_decimal,
        position: e.position,
        prevPosition: old.position,
        publications: e.publications,
        firstviewed: old.firstSeen,
        appearanceCount: currAscCount,
        windowHours: config.thresholds.entityAscendingWindowHours,
        category: entityCategory,
        ...enrichment,
      });
    }
  }

  // Persist the entity→category mapping so other polls (media) can route correctly
  updateState({
    entities: next,
    entityCategoryMap: { ...getState().entityCategoryMap, ...entityCategoryMap },
  });
  return alerts;
}
