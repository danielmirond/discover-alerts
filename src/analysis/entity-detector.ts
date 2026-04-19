import { config } from '../config.js';
import { getState, updateState } from '../state/store.js';
import { buildEntityTopicMap, loadTopicsDictionary } from './topic-classifier.js';
import { classifyEntitiesBatch, type ClassifyRequest } from './llm-classifier.js';
import { computeVelocity } from './velocity.js';
import { checkImage } from './image-check.js';
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
 * Extrae el nombre (string) de una entrada de `page.entities`. DS a veces
 * devuelve strings y otras objetos `{entity, name, text, title}`. Tolera
 * ambos shapes y devuelve null si no puede extraer un nombre válido.
 */
export function extractEntityName(e: unknown): string | null {
  if (typeof e === 'string') return e.trim() || null;
  if (!e || typeof e !== 'object') return null;
  const obj = e as Record<string, unknown>;
  const candidate =
    (typeof obj.entity === 'string' && obj.entity) ||
    (typeof obj.name === 'string' && obj.name) ||
    (typeof obj.text === 'string' && obj.text) ||
    (typeof obj.title === 'string' && obj.title);
  if (typeof candidate !== 'string') return null;
  return candidate.trim() || null;
}

function pruneKeys<T>(obj: Record<string, T>, keep: (k: string) => boolean): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (keep(k)) out[k] = v;
  }
  return out;
}

/** Normaliza `page.entities` (mixto string/object) a string[]. */
function pageEntityNames(page: DiscoverPage): string[] {
  const raw = page.entities as unknown as unknown[] | undefined;
  if (!raw || !Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const e of raw) {
    const n = extractEntityName(e);
    if (n) out.push(n);
  }
  return out;
}

/**
 * Builds a map of entity name -> most frequent category based on
 * DiscoverPages that mention each entity. Uses majority vote.
 */
function buildEntityCategoryMap(
  pages: DiscoverPage[],
  categoryNames: Record<number, string>,
): Record<string, string> {
  const counts: Record<string, Record<string, number>> = {};

  // Debug one-time: dump shape del primer page.entities para verificar el tipo real
  if (pages.length > 0 && pages[0].entities && pages[0].entities.length > 0) {
    const raw = (pages[0].entities as unknown[])[0];
    console.log(`[entity-detector] Sample page.entities[0] shape:`, typeof raw === 'object' ? JSON.stringify(raw).slice(0, 200) : `"${raw}"`);
  }

  for (const page of pages) {
    const names = pageEntityNames(page);
    if (names.length === 0) continue;

    // Resolve category name (page.category can be a name string or numeric id)
    let categoryName: string | undefined;
    if (typeof page.category === 'number') {
      categoryName = categoryNames[page.category];
    } else if (typeof page.category === 'string' && page.category.trim()) {
      categoryName = page.category;
    }
    if (!categoryName) continue;

    for (const entityName of names) {
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

/** Cleans RSS description / DiscoverSnoop snippet: strip HTML, trim, truncate to ~160 chars. */
function cleanSnippet(raw: string | undefined, maxLen = 160): string {
  if (!raw) return '';
  // Strip tags + decode minimal entities + collapse whitespace
  let s = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  if (s.length > maxLen) {
    // Truncate at the last space before the limit
    const slice = s.slice(0, maxLen);
    const lastSpace = slice.lastIndexOf(' ');
    s = (lastSpace > maxLen - 40 ? slice.slice(0, lastSpace) : slice).trim() + '…';
  }
  return s;
}

/**
 * Enriches an ascending/spike entity with matching Google Trends topics,
 * matching media articles (from cached state) and real snippets from the
 * current poll's Discover pages where the entity appears.
 */
function enrichAscending(
  entityName: string,
  state: ReturnType<typeof getState>,
  fuzzyThreshold: number,
  pagesForContext: DiscoverPage[] = [],
): {
  matchingTrends: MatchedTrend[];
  matchingXTrends: MatchedXTrend[];
  matchingArticles: MatchedMediaArticle[];
  contextSnippets: string[];
  imageUrl?: string;
  imageAlt?: string;
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

  // Match against cached media articles (substring on title), incluyendo description
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
        description: cleanSnippet((meta as any).description),
      });
    }
  }

  // Collect real context snippets: up to 3 frases distintas a partir de:
  //   (a) DiscoverSnoop page snippets del poll actual donde aparece la entidad
  //   (b) RSS media article descriptions donde aparece la entidad
  // Priorizamos pages Discover (más alineadas con lo que Google está mostrando).
  const contextSnippets: string[] = [];
  const seen = new Set<string>();
  function addSnippet(s: string) {
    const cleaned = cleanSnippet(s);
    if (!cleaned || cleaned.length < 30) return;
    const key = normalize(cleaned.slice(0, 80));
    if (seen.has(key)) return;
    seen.add(key);
    contextSnippets.push(cleaned);
  }
  for (const page of pagesForContext) {
    if (contextSnippets.length >= 3) break;
    if (!page.snippet) continue;
    const pTitleNorm = normalize(page.title || '');
    const pSnippetNorm = normalize(page.snippet);
    const entityInPage = pageEntityNames(page).some(e => e === entityName) ||
      pTitleNorm.includes(entityNorm) ||
      pSnippetNorm.includes(entityNorm);
    if (entityInPage) addSnippet(page.snippet);
  }
  for (const a of matchingArticles) {
    if (contextSnippets.length >= 3) break;
    if (a.description) addSnippet(a.description);
  }

  // Top Discover page for this entity = fuente de la imagen que Google está mostrando
  let imageUrl: string | undefined;
  let imageAlt: string | undefined;
  let bestScore = -1;
  for (const page of pagesForContext) {
    if (!page.image) continue;
    const titleNorm = normalize(page.title || '');
    const entityInPage = pageEntityNames(page).some(e => e === entityName) ||
      titleNorm.includes(entityNorm);
    if (!entityInPage) continue;
    const sc = page.score || 0;
    if (sc > bestScore) {
      bestScore = sc;
      imageUrl = page.image;
      imageAlt = page.title || entityName;
    }
  }

  return {
    matchingTrends: matchingTrends.slice(0, 3),
    matchingXTrends: matchingXTrends.slice(0, 3),
    matchingArticles: matchingArticles.slice(0, 5),
    contextSnippets,
    imageUrl,
    imageAlt,
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

  // LLM fallback: para entidades que el keyword-matcher no clasifico pero
  // aparecen en >=1 pagina (señal de relevancia), pedimos a Claude Haiku
  // que clasifique. Resultados cacheados 7 dias; fail-open ante errores.
  if (topicsDict.topics.length > 0 && pages.length > 0) {
    // Build entity -> sample titles map from pages
    const entitySamples = new Map<string, string[]>();
    for (const page of pages) {
      const names = pageEntityNames(page);
      if (names.length === 0) continue;
      const title = (page.title || page.title_original || '').trim();
      if (!title) continue;
      for (const entName of names) {
        if (!entitySamples.has(entName)) entitySamples.set(entName, []);
        const arr = entitySamples.get(entName)!;
        if (arr.length < 3) arr.push(title);
      }
    }
    // Only classify entities still unclassified after keyword step
    const requests: ClassifyRequest[] = [];
    for (const [entName, titles] of entitySamples) {
      if (entityTopicMap[entName]) continue; // already classified by keywords
      requests.push({ entityName: entName, sampleTitles: titles });
    }
    if (requests.length > 0) {
      const llmResults = await classifyEntitiesBatch(requests, topicsDict);
      // Merge LLM results into entityTopicMap (only positive hits)
      for (const [entName, topic] of Object.entries(llmResults)) {
        entityTopicMap[entName] = topic;
      }
    }
  }

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
      const enrichment = enrichAscending(e.entity, state, fuzzyThreshold, pages);
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
      const enrichment = enrichAscending(e.entity, state, fuzzyThreshold, pages);
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
      const enrichment = enrichAscending(e.entity, state, fuzzyThreshold, pages);
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
      const enrichment = enrichAscending(e.entity, state, fuzzyThreshold, pages);
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
      const enrichment = enrichAscending(e.entity, state, fuzzyThreshold, pages);
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
      const enrichment = enrichAscending(e.entity, state, fuzzyThreshold, pages);
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
  // can route correctly. Filtramos claves corruptas (`[object Object]`,
  // strings vacíos, undefined) que quedaron de bugs anteriores donde el
  // shape de page.entities era un objeto y JS lo stringificaba mal.
  const isValidKey = (k: string) =>
    !!k && k !== '[object Object]' && k !== 'undefined' && k !== 'null';
  const mergedCatMap = pruneKeys(
    { ...getState().entityCategoryMap, ...entityCategoryMap },
    isValidKey,
  );
  const mergedTopicMap = pruneKeys(
    { ...getState().entityTopicMap, ...entityTopicMap },
    isValidKey,
  );
  updateState({
    entities: next,
    entityCategoryMap: mergedCatMap,
    entityTopicMap: mergedTopicMap,
  });
  return alerts;
}
