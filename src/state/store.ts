import { Redis } from '@upstash/redis';
import type { AppState } from '../types.js';

const STATE_KEY = 'discover-alerts:state';

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
    entityCategoryMap: {},
    entityTopicMap: {},
    llmTopicCache: {},
    formulaUsage: [],
    recentAlerts: [],
    weeklyHistory: {},
    lastPollDiscover: null,
    lastPollTrends: null,
    lastPollMedia: null,
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

export async function loadState(): Promise<void> {
  const r = getRedis();
  if (!r) {
    state = emptyState();
    return;
  }
  try {
    const raw = await r.get<AppState>(STATE_KEY);
    state = raw ? { ...emptyState(), ...raw } : emptyState();
    console.log('[store] State loaded from Redis');
  } catch (err) {
    console.error('[store] Redis load failed, starting fresh:', err);
    state = emptyState();
  }
}

export async function saveState(): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(STATE_KEY, state);
  } catch (err) {
    console.error('[store] Redis save failed:', err);
  }
}

export function getState(): AppState {
  return state;
}

export function updateState(partial: Partial<AppState>): void {
  Object.assign(state, partial);
}
