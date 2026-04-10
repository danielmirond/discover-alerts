import { config } from '../config.js';
import { getState, updateState } from '../state/store.js';
import type {
  DiscoverCategory,
  DiscoverPage,
  CategoryAlert,
  CategorySnapshot,
  CategoryHistoryPoint,
  CategoryExamplePage,
} from '../types.js';

const HISTORY_WINDOW_HOURS = 24;
const HISTORY_WINDOW_MS = HISTORY_WINDOW_HOURS * 3600_000;

function pruneHistory(points: CategoryHistoryPoint[], nowMs: number): CategoryHistoryPoint[] {
  return points.filter(p => nowMs - new Date(p.timestamp).getTime() <= HISTORY_WINDOW_MS);
}

/**
 * Returns the oldest history point within the 24h window, or null if we don't
 * have enough history yet.
 */
function baseline24h(points: CategoryHistoryPoint[], nowMs: number): CategoryHistoryPoint | null {
  const pruned = pruneHistory(points, nowMs);
  if (pruned.length === 0) return null;
  return pruned[0]; // oldest entry within the window
}

/**
 * Picks example pages belonging to a given category for inclusion in alerts.
 */
function getExamplePagesForCategory(
  pages: DiscoverPage[],
  categoryId: number,
  categoryNames: Record<number, string>,
): CategoryExamplePage[] {
  const targetName = categoryNames[categoryId]?.toLowerCase();
  const examples: CategoryExamplePage[] = [];

  for (const page of pages) {
    if (examples.length >= 5) break;

    const pageCat =
      typeof page.category === 'number' ? categoryNames[page.category]?.toLowerCase() :
      typeof page.category === 'string' ? page.category.toLowerCase() :
      '';

    if (pageCat && targetName && pageCat === targetName) {
      examples.push({
        title: page.title || page.title_original || '(sin titulo)',
        url: page.url,
        publisher: page.publisher,
      });
    }
  }

  return examples;
}

export function detectCategoryAlerts(
  categories: DiscoverCategory[],
  categoryNames: Record<number, string> = {},
  pages: DiscoverPage[] = [],
): CategoryAlert[] {
  const state = getState();
  const prev = state.categories;
  const alerts: CategoryAlert[] = [];
  const now = new Date().toISOString();
  const nowMs = Date.now();
  const next: Record<number, CategorySnapshot> = {};
  const nextExamples: Record<number, CategoryExamplePage[]> = { ...state.categoryExamplePages };

  for (const c of categories) {
    const name = categoryNames[c.id] ?? prev[c.id]?.name ?? `Category ${c.id}`;
    const prevHistory = prev[c.id]?.history ?? [];

    // Append current sample + prune to 24h window
    const updatedHistory = pruneHistory(
      [...prevHistory, { timestamp: now, score: c.score, publications: c.publications }],
      nowMs,
    );

    next[c.id] = {
      name,
      score: c.score,
      scoreDecimal: c.score_decimal,
      position: c.position,
      publications: c.publications,
      lastUpdated: now,
      history: updatedHistory,
    };

    // Refresh example pages for this category
    const freshExamples = getExamplePagesForCategory(pages, c.id, categoryNames);
    if (freshExamples.length > 0) {
      nextExamples[c.id] = freshExamples;
    }

    const old = prev[c.id];
    if (!old) continue;

    // --- Poll-over-poll spike (original behavior) ---
    const scoreDelta = c.score - old.score;
    const pubIncrease = old.publications > 0
      ? (c.publications - old.publications) / old.publications
      : 0;

    let firedShort = false;
    if (
      scoreDelta >= config.thresholds.categoryScoreJump ||
      pubIncrease >= config.thresholds.categoryPublicationsJumpPct
    ) {
      alerts.push({
        type: 'category',
        subtype: 'spike',
        id: c.id,
        name,
        score: c.score,
        prevScore: old.score,
        position: c.position,
        prevPosition: old.position,
        publications: c.publications,
        prevPublications: old.publications,
        examplePages: getExamplePagesForCategory(pages, c.id, categoryNames),
      });
      firedShort = true;
    }

    // --- 24h spike (vs baseline 24h ago) ---
    const baseline = baseline24h(prevHistory, nowMs);
    if (baseline && !firedShort) {
      const dayDelta = c.score - baseline.score;
      if (dayDelta >= config.thresholds.categoryDayScoreJump) {
        alerts.push({
          type: 'category',
          subtype: 'day_spike',
          id: c.id,
          name,
          score: c.score,
          prevScore: baseline.score,
          position: c.position,
          prevPosition: old.position,
          publications: c.publications,
          prevPublications: baseline.publications,
          windowHours: HISTORY_WINDOW_HOURS,
          examplePages: getExamplePagesForCategory(pages, c.id, categoryNames),
        });
      }
    }
  }

  updateState({ categories: next, categoryExamplePages: nextExamples });
  return alerts;
}
