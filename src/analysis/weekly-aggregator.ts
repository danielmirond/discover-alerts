import { getState, updateState } from '../state/store.js';
import type { MediaArticle, WeeklyMediaStats, AppState } from '../types.js';

const WEEKS_TO_KEEP = 60; // ≈14 meses — permite detectar recurrencia estacional año sobre año
const MAX_ENTITIES_PER_FEED = 200;
const MAX_PATTERNS_PER_FEED = 200;

/**
 * Returns the ISO week key for a given date, e.g. "2026-W15".
 */
export function weekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // ISO week: Thursday of the week determines the year
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const SPANISH_STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'al', 'del',
  'de', 'en', 'y', 'o', 'que', 'es', 'por', 'con', 'para', 'como',
  'se', 'su', 'sus', 'le', 'les', 'lo', 'mas', 'ya', 'no', 'si',
  'ha', 'han', 'fue', 'ser', 'este', 'esta', 'estos', 'estas', 'ese',
  'esa', 'esos', 'esas', 'pero', 'sin', 'sobre', 'entre', 'hasta',
  'desde', 'muy', 'todo', 'toda', 'todos', 'todas', 'pero',
]);

function tokenize(title: string): string[] {
  return normalize(title)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !SPANISH_STOPWORDS.has(w));
}

function trigrams(words: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i <= words.length - 3; i++) {
    result.push(words.slice(i, i + 3).join(' '));
  }
  return result;
}

/**
 * Trims a counts dict to its top-N by value.
 */
function trimTopN(counts: Record<string, number>, n: number): Record<string, number> {
  const entries = Object.entries(counts);
  if (entries.length <= n) return counts;
  entries.sort((a, b) => b[1] - a[1]);
  const result: Record<string, number> = {};
  for (const [k, v] of entries.slice(0, n)) result[k] = v;
  return result;
}

/**
 * Increments the weekly stats for each NEW article in the batch.
 * Looks up entities via state.entities (substring match in title) and
 * derives their DiscoverSnoop category via state.entityCategoryMap.
 *
 * @param newArticles articles that are being seen for the first time
 * @param state       current state (passed in to avoid re-reading)
 */
export function aggregateWeekly(
  newArticles: MediaArticle[],
  state: AppState,
): void {
  if (newArticles.length === 0) return;

  const wKey = weekKey();
  const history = { ...(state.weeklyHistory || {}) };
  const weekData: Record<string, WeeklyMediaStats> = { ...(history[wKey] || {}) };

  // Pre-normalize entity names for substring matching (cheaper to do once)
  const entityNormList: Array<[string, string]> = Object.keys(state.entities)
    .filter(n => n.length > 3)
    .map(n => [n, normalize(n)]);

  for (const article of newArticles) {
    if (!article.feedName || !article.title) continue;

    let bucket = weekData[article.feedName];
    if (!bucket) {
      bucket = {
        articleCount: 0,
        entities: {},
        categories: {},
        patterns: {},
        feedCategory: article.feedCategory,
      };
      weekData[article.feedName] = bucket;
    }

    bucket.articleCount++;

    const titleNorm = normalize(article.title);

    // Count entities mentioned in the title
    const mentionedEntities: string[] = [];
    for (const [name, nNorm] of entityNormList) {
      if (titleNorm.includes(nNorm)) {
        bucket.entities[name] = (bucket.entities[name] || 0) + 1;
        mentionedEntities.push(name);
      }
    }

    // Derive DiscoverSnoop category via entityCategoryMap (majority across mentions)
    const catCounts: Record<string, number> = {};
    for (const ent of mentionedEntities) {
      const cat = state.entityCategoryMap[ent];
      if (cat) catCounts[cat] = (catCounts[cat] || 0) + 1;
    }
    for (const [cat, c] of Object.entries(catCounts)) {
      bucket.categories[cat] = (bucket.categories[cat] || 0) + c;
    }

    // 3-gram patterns in the title
    const words = tokenize(article.title);
    for (const tg of trigrams(words)) {
      bucket.patterns[tg] = (bucket.patterns[tg] || 0) + 1;
    }
  }

  // Trim to avoid unbounded growth
  for (const feedName of Object.keys(weekData)) {
    weekData[feedName].entities = trimTopN(weekData[feedName].entities, MAX_ENTITIES_PER_FEED);
    weekData[feedName].patterns = trimTopN(weekData[feedName].patterns, MAX_PATTERNS_PER_FEED);
  }

  history[wKey] = weekData;

  // Prune: keep only last WEEKS_TO_KEEP weeks (by key sort descending)
  const allWeeks = Object.keys(history).sort().reverse();
  const kept = allWeeks.slice(0, WEEKS_TO_KEEP);
  const prunedHistory: Record<string, Record<string, WeeklyMediaStats>> = {};
  for (const k of kept) prunedHistory[k] = history[k];

  updateState({ weeklyHistory: prunedHistory });
}
