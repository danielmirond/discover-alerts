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
// Shards extra añadidos para sacar peso del core y evitar que crezca a MB.
// Antes vivían dentro de core y lo inflaban a 8MB en instancias activas.
const AUDITS_KEY = 'discover-alerts:audits';   // contentAudits (max 400, 7d)
const INTL_KEY = 'discover-alerts:intl';       // internationalSport + tracking
const KG_KEY = 'discover-alerts:kg';           // entityKgEnrichment (max 2000)

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
  // Sacamos los campos pesados del core: contentAudits (10-30MB),
  // internationalSport/Tracking (varios MB) y entityKgEnrichment (hasta 2MB).
  // Cada uno va a su propio shard para que core quepa bien dentro del límite
  // y las lecturas por endpoint sean mucho más baratas.
  const anyS = s as any;
  const contentAudits = anyS.contentAudits || {};
  const internationalSport = anyS.internationalSport || {};
  const internationalTracking = anyS.internationalTracking || {};
  const lastPollInternational = anyS.lastPollInternational || null;
  const entityKgEnrichment = anyS.entityKgEnrichment || {};
  const {
    mediaArticles, weeklyHistory, pages, recentAlerts,
    headlinePatternsHistory, dedupHashes,
    ...rest
  } = s;
  // Core limpio: sin los campos pesados movidos a shards propios
  const core: any = { ...rest };
  delete core.contentAudits;
  delete core.internationalSport;
  delete core.internationalTracking;
  delete core.lastPollInternational;
  delete core.entityKgEnrichment;
  return {
    core,
    mediaArticles, weeklyHistory, pages, recentAlerts,
    headlinePatternsHistory, dedupHashes,
    contentAudits,
    intlPayload: { internationalSport, internationalTracking, lastPollInternational },
    entityKgEnrichment,
  };
}

/** Shards disponibles. Permite loadState parcial para reducir bandwidth. */
export type Shard = 'core' | 'media' | 'weekly' | 'pages' | 'recent' | 'patterns' | 'dedup' | 'audits' | 'intl' | 'kg';

/** Cache en memoria por shard dentro de un mismo serverless container.
 * Vercel reusa containers por ~5-15 min. Con TTL de 60s evitamos hits
 * repetidos al Redis desde el mismo serverless warm. Reduce bandwidth
 * ~70% en lecturas de endpoints frecuentes. */
const SHARD_CACHE_MS = 60_000;
const shardCache: Record<string, { loadedAt: number; data: any }> = {};
function cacheGet(key: string): any | undefined {
  const e = shardCache[key];
  if (!e) return undefined;
  if (Date.now() - e.loadedAt > SHARD_CACHE_MS) return undefined;
  return e.data;
}
function cacheSet(key: string, data: any): void {
  shardCache[key] = { loadedAt: Date.now(), data };
}
/** Invalida cache (llamar tras saveState desde el mismo proceso). */
export function invalidateStateCache(): void {
  for (const k of Object.keys(shardCache)) delete shardCache[k];
}

export async function loadState(shards?: Shard[]): Promise<void> {
  const r = getRedis();
  if (!r) {
    state = emptyState();
    return;
  }
  const want = new Set<Shard>(shards && shards.length > 0 ? shards : ['core', 'media', 'weekly', 'pages', 'recent', 'patterns', 'dedup', 'audits', 'intl', 'kg']);
  const need = (s: Shard) => want.has(s);

  async function loadShard<T>(name: Shard, key: string): Promise<T | null> {
    if (!need(name)) return null;
    const cached = cacheGet(name);
    if (cached !== undefined) return cached as T | null;
    const data = await r!.get<T>(key).catch(e => { console.error(`[store] load ${name} failed:`, e); return null; });
    cacheSet(name, data);
    return data;
  }

  try {
    const [core, mediaArticles, weeklyHistory, pages, recentAlerts, patternsHist, dedupH, audits, intl, kg] = await Promise.all([
      loadShard<Partial<AppState>>('core', CORE_KEY),
      loadShard<AppState['mediaArticles']>('media', MEDIA_KEY),
      loadShard<AppState['weeklyHistory']>('weekly', WEEKLY_KEY),
      loadShard<AppState['pages']>('pages', PAGES_KEY),
      loadShard<AppState['recentAlerts']>('recent', RECENT_KEY),
      loadShard<AppState['headlinePatternsHistory']>('patterns', PATTERNS_HIST_KEY),
      loadShard<AppState['dedupHashes']>('dedup', DEDUP_KEY),
      loadShard<Record<string, any>>('audits', AUDITS_KEY),
      loadShard<{ internationalSport?: any; internationalTracking?: any; lastPollInternational?: string | null }>('intl', INTL_KEY),
      loadShard<Record<string, any>>('kg', KG_KEY),
    ]);
    const coreAny = (core || {}) as any;
    const prev = state;
    state = ({
      ...prev,
      ...(need('core') ? (core || {}) : {}),
      // Shards nuevos (audits, intl, kg) con fallback a los campos del core
      // antiguo cuando aún viven ahí (migración desde el bloat).
      contentAudits: need('audits')
        ? ((audits && Object.keys(audits).length > 0) ? audits : ((core as any)?.contentAudits || (prev as any).contentAudits || {}))
        : ((prev as any).contentAudits || {}),
      internationalSport: need('intl')
        ? ((intl?.internationalSport) || (core as any)?.internationalSport || (prev as any).internationalSport || {})
        : ((prev as any).internationalSport || {}),
      internationalTracking: need('intl')
        ? ((intl?.internationalTracking) || (core as any)?.internationalTracking || (prev as any).internationalTracking || {})
        : ((prev as any).internationalTracking || {}),
      lastPollInternational: need('intl')
        ? ((intl?.lastPollInternational) || (core as any)?.lastPollInternational || null)
        : (((prev as any).lastPollInternational) || null),
      entityKgEnrichment: need('kg')
        ? ((kg && Object.keys(kg).length > 0) ? kg : ((core as any)?.entityKgEnrichment || (prev as any).entityKgEnrichment || {}))
        : ((prev as any).entityKgEnrichment || {}),
      mediaArticles: need('media')
        ? ((mediaArticles && Object.keys(mediaArticles).length > 0) ? mediaArticles : (coreAny.mediaArticles || {}))
        : prev.mediaArticles,
      weeklyHistory: need('weekly')
        ? ((weeklyHistory && Object.keys(weeklyHistory).length > 0) ? weeklyHistory : (coreAny.weeklyHistory || {}))
        : prev.weeklyHistory,
      pages: need('pages')
        ? ((pages && Object.keys(pages).length > 0) ? pages : (coreAny.pages || {}))
        : prev.pages,
      recentAlerts: need('recent')
        ? ((recentAlerts && recentAlerts.length > 0) ? recentAlerts : (coreAny.recentAlerts || []))
        : prev.recentAlerts,
      headlinePatternsHistory: need('patterns')
        ? ((patternsHist && patternsHist.length > 0) ? patternsHist : (coreAny.headlinePatternsHistory || []))
        : prev.headlinePatternsHistory,
      dedupHashes: need('dedup')
        ? ((dedupH && Object.keys(dedupH).length > 0) ? dedupH : (coreAny.dedupHashes || {}))
        : prev.dedupHashes,
    } as AppState);
    if (shards) {
      console.log(`[store] loaded shards: ${[...want].join(',')}`);
    } else {
      console.log(`[store] State loaded from Redis (sharded) · media=${Object.keys(state.mediaArticles).length} weekly=${Object.keys(state.weeklyHistory).length} pages=${Object.keys(state.pages).length} recent=${state.recentAlerts.length}`);
    }
  } catch (err) {
    console.error('[store] Redis load failed, starting fresh:', err);
    state = emptyState();
  }
}

// Límite seguro por shard (Upstash free tier ≈1 MB por request, observado
// que rechaza por encima de ~1MB neto). Subido de 900k a 950k para aprovechar
// más espacio sin acercarse al borde.
const SHARD_MAX_BYTES = 950_000;

function trimByRecency<T extends { firstSeen?: string; pubDate?: string; lastUpdated?: string; timestamp?: string }>(
  obj: Record<string, T>,
  maxBytes: number,
): Record<string, T> {
  const json = JSON.stringify(obj);
  if (json.length <= maxBytes) return obj;
  // Ordenar por tiempo (más reciente primero) y añadir hasta llenar.
  // Priorizamos pubDate (fecha real del publisher) sobre firstSeen (cuándo
  // lo vimos NOSOTROS). Al cargar un sitemap-news nuevo con cientos de
  // artículos, todos tienen firstSeen=ahora pero pubDate variado — usar
  // pubDate evita que un publisher monopolice el shard.
  const entries = Object.entries(obj);
  const ts = (v: T) => Date.parse(v.pubDate || v.lastUpdated || v.firstSeen || v.timestamp || '') || 0;
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
  let { core, mediaArticles, weeklyHistory, pages, recentAlerts, headlinePatternsHistory, dedupHashes, contentAudits, intlPayload, entityKgEnrichment } = splitShards(state);

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
    audits: JSON.stringify(contentAudits || {}).length,
    intl: JSON.stringify(intlPayload || {}).length,
    kg: JSON.stringify(entityKgEnrichment || {}).length,
  };
  console.log(`[store] save sizes (bytes): core=${sizes.core} media=${sizes.media} weekly=${sizes.weekly} pages=${sizes.pages} recent=${sizes.recent} patterns=${sizes.patterns} dedup=${sizes.dedup} audits=${sizes.audits} intl=${sizes.intl} kg=${sizes.kg}`);

  // Invalidar cache en memoria antes de sobrescribir — próximos loadState
  // dentro del mismo serverless container deben leer el valor nuevo.
  invalidateStateCache();

  const results = await Promise.allSettled([
    r.set(CORE_KEY, core),
    r.set(MEDIA_KEY, mediaArticles),
    r.set(WEEKLY_KEY, weeklyHistory),
    r.set(PAGES_KEY, pages),
    r.set(RECENT_KEY, recentAlerts),
    r.set(PATTERNS_HIST_KEY, headlinePatternsHistory || []),
    r.set(DEDUP_KEY, dedupHashes || {}),
    r.set(AUDITS_KEY, contentAudits || {}),
    r.set(INTL_KEY, intlPayload || {}),
    r.set(KG_KEY, entityKgEnrichment || {}),
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
