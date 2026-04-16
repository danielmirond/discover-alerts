import { config } from '../config.js';
import { getState, updateState } from '../state/store.js';
import { buildEntityTopicMap, loadTopicsDictionary } from './topic-classifier.js';
import { computeVelocity } from './velocity.js';
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

export async function detectEntityAlerts(
  entities: DiscoverEntity[],
  pages: DiscoverPage[] = [],
  categoryNames: Record<number, string> = {},
): Promise<EntityAlert[]> {
  const state = getState();
  const prev = state.entities;
  const alerts: EntityAlert[] = [];
  const now = new Date().toISOString();
  const nowMs = Date.now();
  const next: Record<string, EntitySnapshot> = {};

  // Derive category for each entity from pages that mention it
  const entityCategoryMap = buildEntityCategoryMap(pages, categoryNames);
  // Derive keyword-based topic (sucesos/legal/...) — ortogonal a la categoria DS
  const topicsDict = await loadTopicsDictionary();
  const entityTopicMap = buildEntityTopicMap(pages, topicsDict);

  const ascendingMin = config.thresholds.entityAscendingMinAppearances;
  const ascendingWindowMs = config.thresholds.entityAscendingWindowHours * 3600_000;
  const longtailMin = config.thresholds.entityLongtailMinAppearances;
  const longtailWindowMs = config.thresholds.entityLongtailWindowHours * 3600_000;
  const flashMin = config.thresholds.entityFlashMinAppearances;
  const flashWindowMs = config.thresholds.entityFlashWindowHours * 3600_000;
  const fuzzyThreshold = config.thresholds.trendCorrelationMin;

  // New discover_Xh window thresholds
  const disc1hWindowMs = 1 * 3600_000;
  const disc3hWindowMs = 3 * 3600_000;
  const disc12hWindowMs = 12 * 3600_000;
  const disc1hMin = config.thresholds.entityDiscover1hMinAppearances;
  const disc3hMin = config.thresholds.entityDiscover3hMinAppearances;
  const disc12hMin = config.thresholds.entityDiscover12hMinAppearances;

  // We need the LONGEST window for appearance retention. discover_12h forces it.
  const maxRetentionMs = Math.max(ascendingWindowMs, disc12hWindowMs);

  const countInWindow = (timestamps: string[], windowMs: number): number =>
    timestamps.filter(ts => nowMs - new Date(ts).getTime() <= windowMs).length;

  // Preserve old entities that weren't in this poll but still have recent appearances.
  // Without this, an entity that appears in poll #1 and #3 but not #2 would lose its
  // history, breaking the flash/spike/ascending detection for intermittent entities.
  const currentEntitySet = new Set(entities.map(e => e.entity));
  for (const [name, oldSnap] of Object.entries(prev)) {
    if (currentEntitySet.has(name)) continue;
    const prunedAppearances = (oldSnap.appearances ?? []).filter(
      ts => nowMs - new Date(ts).getTime() <= maxRetentionMs,
    );
    // Drop entities whose appearances all expired
    if (prunedAppearances.length === 0) continue;
    next[name] = { ...oldSnap, appearances: prunedAppearances };
  }

  for (const e of entities) {
    const old = prev[e.entity];
    const prevAppearances = old?.appearances ?? [];
    const entityCategory = entityCategoryMap[e.entity];
    const entityTopic = entityTopicMap[e.entity];
    // Velocity snapshot computed from the forthcoming appearances (incl. `now`)
    // — we defer this until after we build `appearances` a few lines below.

    // Prune appearances outside the longest window we care about (12h)
    const appearances = [
      ...prevAppearances.filter(ts => nowMs - new Date(ts).getTime() <= maxRetentionMs),
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

    // Velocity / momentum snapshot for this entity at this poll.
    const velocity = computeVelocity(appearances, nowMs);

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
        topic: entityTopic,
        velocity,
      });
    }

    // The three window checks fire INDEPENDENTLY when each crosses its threshold.
    // A single entity can fire flash + longtail + ascending in the same poll.
    // Dedup uses (subtype, entity) so they don't collapse.

    // Flash: 3+ apariciones en 1h (pico rapido)
    const prevFlashCount = countInWindow(prevAppearances, flashWindowMs);
    const currFlashCount = countInWindow(appearances, flashWindowMs);
    if (prevFlashCount < flashMin && currFlashCount >= flashMin) {
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
        topic: entityTopic,
        velocity,
        ...enrichment,
      });
    }

    // Longtail: 5+ apariciones en 2h (persistencia media)
    const prevLongtailCount = countInWindow(prevAppearances, longtailWindowMs);
    const currLongtailCount = countInWindow(appearances, longtailWindowMs);
    if (prevLongtailCount < longtailMin && currLongtailCount >= longtailMin) {
      const enrichment = enrichAscending(e.entity, state, fuzzyThreshold);
      alerts.push({
        type: 'entity',
        subtype: 'longtail',
        name: e.entity,
        score: e.score,
        prevScore: old.score,
        scoreDecimal: e.score_decimal,
        position: e.position,
        prevPosition: old.position,
        publications: e.publications,
        firstviewed: old.firstSeen,
        appearanceCount: currLongtailCount,
        windowHours: config.thresholds.entityLongtailWindowHours,
        category: entityCategory,
        topic: entityTopic,
        velocity,
        ...enrichment,
      });
    }

    // Ascending: 3+ apariciones en 6h (sostenido largo)
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
        topic: entityTopic,
        velocity,
        ...enrichment,
      });
    }

    // Parallel custom windows: discover_1h / discover_3h / discover_12h
    // Fire once on crossing threshold. Independent of flash/longtail/ascending.
    const prevD1 = countInWindow(prevAppearances, disc1hWindowMs);
    const currD1 = countInWindow(appearances, disc1hWindowMs);
    if (prevD1 < disc1hMin && currD1 >= disc1hMin) {
      const enrichment = enrichAscending(e.entity, state, fuzzyThreshold);
      alerts.push({
        type: 'entity',
        subtype: 'discover_1h',
        name: e.entity,
        score: e.score,
        prevScore: old.score,
        scoreDecimal: e.score_decimal,
        position: e.position,
        prevPosition: old.position,
        publications: e.publications,
        firstviewed: old.firstSeen,
        appearanceCount: currD1,
        windowHours: 1,
        category: entityCategory,
        topic: entityTopic,
        velocity,
        ...enrichment,
      });
    }

    const prevD3 = countInWindow(prevAppearances, disc3hWindowMs);
    const currD3 = countInWindow(appearances, disc3hWindowMs);
    if (prevD3 < disc3hMin && currD3 >= disc3hMin) {
      const enrichment = enrichAscending(e.entity, state, fuzzyThreshold);
      alerts.push({
        type: 'entity',
        subtype: 'discover_3h',
        name: e.entity,
        score: e.score,
        prevScore: old.score,
        scoreDecimal: e.score_decimal,
        position: e.position,
        prevPosition: old.position,
        publications: e.publications,
        firstviewed: old.firstSeen,
        appearanceCount: currD3,
        windowHours: 3,
        category: entityCategory,
        topic: entityTopic,
        velocity,
        ...enrichment,
      });
    }

    const prevD12 = countInWindow(prevAppearances, disc12hWindowMs);
    const currD12 = countInWindow(appearances, disc12hWindowMs);
    if (prevD12 < disc12hMin && currD12 >= disc12hMin) {
      const enrichment = enrichAscending(e.entity, state, fuzzyThreshold);
      alerts.push({
        type: 'entity',
        subtype: 'discover_12h',
        name: e.entity,
        score: e.score,
        prevScore: old.score,
        scoreDecimal: e.score_decimal,
        position: e.position,
        prevPosition: old.position,
        publications: e.publications,
        firstviewed: old.firstSeen,
        appearanceCount: currD12,
        windowHours: 12,
        category: entityCategory,
        topic: entityTopic,
        velocity,
        ...enrichment,
      });
    }
  }

  // Persist the entity→category and entity→topic maps so other polls (media)
  // can route correctly
  updateState({
    entities: next,
    entityCategoryMap: { ...getState().entityCategoryMap, ...entityCategoryMap },
    entityTopicMap: { ...getState().entityTopicMap, ...entityTopicMap },
  });
  return alerts;
}
