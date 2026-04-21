import { Redis } from '@upstash/redis';
import type { AppState } from '../types.js';

/**
 * Sharded state storage.
 *
 * Upstash free/hobby tier tiene límite de ~1MB por request (SET/GET).
 * El state completo crece fácilmente por encima de eso con mediaArticles +
 * weeklyHistory + recentAlerts + pages → el SET fallaba silenciosamente.
 *
 * Solución: partir el AppState en N keys independientes, cada una <1MB.
 *  - CORE_KEY:    campos pequeños (entities, trends, maps, lastPolls, ...)
 *  - MEDIA_KEY:   state.mediaArticles (12k+ entries, ~1-2MB)
 *  - WEEKLY_KEY:  state.weeklyHistory (60 semanas × N feeds)
 *  - PAGES_KEY:   state.pages (top 500 DS pages por poll)
 *  - RECENT_KEY:  state.recentAlerts (últimas 200 alerts)
 *
 * Load y save en paralelo. Si un shard falla, loguea y continúa con el resto —
 * mejor un save parcial que ninguno.
 */

const CORE_KEY = 'discover-alerts:state';
const MEDIA_KEY = 'discover-alerts:media';
const WEEKLY_KEY = 'discover-alerts:weekly';
const PAGES_KEY = 'discover-alerts:pages';
const RECENT_KEY = 'discover-alerts:recent';
const PATTERNS_HIST_KEY = 'discover-alerts:patterns-hist';
const DEDUP_KEY = 'discover-alerts:dedup';

function emptyState(): AppState {
  return {
    entities: {},
    categories: {},
    categoryExamplePages: {},
    pages: {},
    domains: {},
    trends: {},
    trendsUS: {},
    xTrends: {},
    headlinePatterns: {},
    headlinePatternsHistory: [],
    dedupHashes: {},
    mediaArticles: {},
    boeItems: {},
    entityCategoryMap: {},
    entityTopicMap: {},
    llmTopicCache: {},
    formulaUsage: [],
    recentAlerts: [],
    weeklyHistory: {},
    lastPollDiscover: null,
    lastPollTrends: null,
    lastPollMedia: null,
    lastPollBoe: null,
    lastPollX: null,
  };
}

let redis: Redis | null = null;
let state: AppState = emptyState();

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn('[store] Upstash Redis env vars missing, using in-memory state');
    return null;
  }
  redis = new Redis({ url, token });
  return redis;
}

/** Separa del state completo los campos pesados para que core quepa. */
function splitShards(s: AppState) {
  const { mediaArticles, weeklyHistory, pages, recentAlerts, headlinePatternsHistory, dedupHashes, ...core } = s;
  return { core, mediaArticles, weeklyHistory, pages, recentAlerts, headlinePatternsHistory, dedupHashes };
}

export async function loadState(): Promise<void> {
  const r = getRedis();
  if (!r) {
    state = emptyState();
    return;
  }
  try {
    const [core, mediaArticles, weeklyHistory, pages, recentAlerts, patternsHist, dedupH] = await Promise.all([
      r.get<Partial<AppState>>(CORE_KEY).catch(e => { console.error('[store] load core failed:', e); return null; }),
      r.get<AppState['mediaArticles']>(MEDIA_KEY).catch(e => { console.error('[store] load media failed:', e); return null; }),
      r.get<AppState['weeklyHistory']>(WEEKLY_KEY).catch(e => { console.error('[store] load weekly failed:', e); return null; }),
      r.get<AppState['pages']>(PAGES_KEY).catch(e => { console.error('[store] load pages failed:', e); return null; }),
      r.get<AppState['recentAlerts']>(RECENT_KEY).catch(e => { console.error('[store] load recent failed:', e); return null; }),
      r.get<AppState['headlinePatternsHistory']>(PATTERNS_HIST_KEY).catch(e => { console.error('[store] load patterns failed:', e); return null; }),
      r.get<AppState['dedupHashes']>(DEDUP_KEY).catch(e => { console.error('[store] load dedup failed:', e); return null; }),
    ]);
    // Migración: si un shard nuevo viene vacío pero el core antiguo (pre-sharding)
    // tenía ese campo, usamos el del core para no perder histórico.
    const coreAny = (core || {}) as any;
    state = {
      ...emptyState(),
      ...(core || {}),
      mediaArticles: (mediaArticles && Object.keys(mediaArticles).length > 0) ? mediaArticles : (coreAny.mediaArticles || {}),
      weeklyHistory: (weeklyHistory && Object.keys(weeklyHistory).length > 0) ? weeklyHistory : (coreAny.weeklyHistory || {}),
      pages: (pages && Object.keys(pages).length > 0) ? pages : (coreAny.pages || {}),
      recentAlerts: (recentAlerts && recentAlerts.length > 0) ? recentAlerts : (coreAny.recentAlerts || []),
      headlinePatternsHistory: (patternsHist && patternsHist.length > 0) ? patternsHist : (coreAny.headlinePatternsHistory || []),
      dedupHashes: (dedupH && Object.keys(dedupH).length > 0) ? dedupH : (coreAny.dedupHashes || {}),
    };
    console.log(`[store] State loaded from Redis (sharded) · media=${Object.keys(state.mediaArticles).length} weekly=${Object.keys(state.weeklyHistory).length} pages=${Object.keys(state.pages).length} recent=${state.recentAlerts.length}`);
  } catch (err) {
    console.error('[store] Redis load failed, starting fresh:', err);
    state = emptyState();
  }
}

// Límite seguro por shard (Upstash free tier ≈1 MB por request).
// Si un shard se pasa, truncamos las entradas más antiguas antes de guardar.
const SHARD_MAX_BYTES = 900_000;

function trimByRecency<T extends { firstSeen?: string; pubDate?: string; lastUpdated?: string; timestamp?: string }>(
  obj: Record<string, T>,
  maxBytes: number,
): Record<string, T> {
  const json = JSON.stringify(obj);
  if (json.length <= maxBytes) return obj;
  // Ordenar por tiempo (más reciente primero) y añadir hasta llenar
  const entries = Object.entries(obj);
  const ts = (v: T) => Date.parse(v.lastUpdated || v.firstSeen || v.pubDate || v.timestamp || '') || 0;
  entries.sort(([, a], [, b]) => ts(b) - ts(a));
  const out: Record<string, T> = {};
  let acc = 2; // '{}'
  for (const [k, v] of entries) {
    const chunk = JSON.stringify({ [k]: v });
    if (acc + chunk.length > maxBytes) break;
    out[k] = v;
    acc += chunk.length;
  }
  return out;
}

export async function saveState(): Promise<void> {
  const r = getRedis();
  if (!r) return;
  let { core, mediaArticles, weeklyHistory, pages, recentAlerts, headlinePatternsHistory, dedupHashes } = splitShards(state);

  // Auto-trim shards que excedan límite. Mejor guardar parcial que no guardar nada.
  const before = {
    media: Object.keys(mediaArticles || {}).length,
    pages: Object.keys(pages || {}).length,
    weekly: Object.keys(weeklyHistory || {}).length,
    dedup: Object.keys(dedupHashes || {}).length,
  };
  if (JSON.stringify(mediaArticles).length > SHARD_MAX_BYTES) {
    mediaArticles = trimByRecency(mediaArticles, SHARD_MAX_BYTES);
    state.mediaArticles = mediaArticles; // reflejar en memoria
    console.warn(`[store] trimmed mediaArticles: ${before.media} → ${Object.keys(mediaArticles).length}`);
  }
  if (JSON.stringify(pages).length > SHARD_MAX_BYTES) {
    pages = trimByRecency(pages as any, SHARD_MAX_BYTES) as any;
    state.pages = pages;
    console.warn(`[store] trimmed pages: ${before.pages} → ${Object.keys(pages).length}`);
  }
  if (JSON.stringify(dedupHashes).length > SHARD_MAX_BYTES) {
    dedupHashes = trimByRecency(dedupHashes as any, SHARD_MAX_BYTES) as any;
    state.dedupHashes = dedupHashes;
    console.warn(`[store] trimmed dedupHashes: ${before.dedup} → ${Object.keys(dedupHashes).length}`);
  }
  // weekly truncamos diferente: por weekKey alfabético (más reciente mantenidas)
  if (JSON.stringify(weeklyHistory).length > SHARD_MAX_BYTES) {
    const wks = Object.keys(weeklyHistory).sort().reverse();
    const trimmed: typeof weeklyHistory = {};
    let acc = 2;
    for (const wk of wks) {
      const chunk = JSON.stringify({ [wk]: weeklyHistory[wk] });
      if (acc + chunk.length > SHARD_MAX_BYTES) break;
      trimmed[wk] = weeklyHistory[wk];
      acc += chunk.length;
    }
    weeklyHistory = trimmed;
    state.weeklyHistory = trimmed;
    console.warn(`[store] trimmed weeklyHistory: ${before.weekly} → ${Object.keys(trimmed).length} weeks`);
  }

  // Sizes para diagnóstico (post-trim)
  const sizes = {
    core: JSON.stringify(core).length,
    media: JSON.stringify(mediaArticles).length,
    weekly: JSON.stringify(weeklyHistory).length,
    pages: JSON.stringify(pages).length,
    recent: JSON.stringify(recentAlerts).length,
    patterns: JSON.stringify(headlinePatternsHistory || []).length,
    dedup: JSON.stringify(dedupHashes || {}).length,
  };
  console.log(`[store] save sizes (bytes): core=${sizes.core} media=${sizes.media} weekly=${sizes.weekly} pages=${sizes.pages} recent=${sizes.recent} patterns=${sizes.patterns} dedup=${sizes.dedup}`);

  const results = await Promise.allSettled([
    r.set(CORE_KEY, core),
    r.set(MEDIA_KEY, mediaArticles),
    r.set(WEEKLY_KEY, weeklyHistory),
    r.set(PAGES_KEY, pages),
    r.set(RECENT_KEY, recentAlerts),
    r.set(PATTERNS_HIST_KEY, headlinePatternsHistory || []),
    r.set(DEDUP_KEY, dedupHashes || {}),
  ]);
  const names = ['core', 'media', 'weekly', 'pages', 'recent', 'patterns', 'dedup'];
  results.forEach((res, i) => {
    if (res.status === 'rejected') {
      console.error(`[store] save ${names[i]} failed (size=${sizes[names[i] as keyof typeof sizes]}):`, res.reason);
    }
  });
  const ok = results.filter(r => r.status === 'fulfilled').length;
  if (ok < results.length) {
    console.error(`[store] ${ok}/${results.length} shards saved`);
  }
}

export function getState(): AppState {
  return state;
}

export function updateState(partial: Partial<AppState>): void {
  Object.assign(state, partial);
}
