import { Redis } from '@upstash/redis';
import type { AppState, Alert } from '../types.js';

const STATE_KEY = 'discover-alerts:state';
const MAX_ALERT_HISTORY = 500;

function emptyState(): AppState {
  return {
    entities: {},
    categories: {},
    pages: {},
    domains: {},
    social: {},
    trends: {},
    headlinePatterns: {},
    dedupHashes: {},
    mediaArticles: {},
    alertHistory: [],
    lastPollDiscover: null,
    lastPollTrends: null,
    lastPollMedia: null,
  };
}

let redis: Redis | null = null;
let state: AppState = emptyState();

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

export async function loadState(): Promise<void> {
  try {
    const raw = await getRedis().get<AppState>(STATE_KEY);
    state = raw ? { ...emptyState(), ...raw } : emptyState();
    console.log('[store] State loaded from Redis');
  } catch (err) {
    console.error('[store] Redis load failed, starting fresh:', err);
    state = emptyState();
  }
}

export async function saveState(): Promise<void> {
  try {
    await getRedis().set(STATE_KEY, state);
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

export function persistAlerts(alerts: Alert[]): void {
  const now = new Date().toISOString();
  const entries = alerts.map(alert => ({ alert, timestamp: now }));
  state.alertHistory = [...entries, ...state.alertHistory].slice(0, MAX_ALERT_HISTORY);
}

export function getAlertHistory(): AppState['alertHistory'] {
  return state.alertHistory;
}
