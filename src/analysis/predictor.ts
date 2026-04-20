import type { AppState, WeeklyMediaStats } from '../types.js';
import { weekKey } from './weekly-aggregator.js';

/**
 * Predictor estacional YoY.
 *
 * Dado el estado actual (con `state.weeklyHistory` persistido por la
 * agregación semanal), identifica entidades/categorías/patrones que
 * explotaron en la misma semana ISO de años anteriores y que, por
 * tanto, probablemente vuelvan a emerger ahora.
 *
 * Ejemplo: si en 2025-W16 la entidad "Semana Santa" tuvo 240 menciones
 * agregadas y en 2024-W16 también, emitimos predicción para 2026-W16.
 *
 * Señal de confianza:
 *  - nYears 1 → baja (1 año de datos)
 *  - nYears 2+ → alta (patrón repetido)
 *
 * Notas honestas:
 *  - El sistema solo tiene ~60 semanas de retención (~14 meses). Durante los
 *    primeros meses de vida solo hay YoY para una ventana acotada.
 *  - Se puede sembrar histórico con backfill via DS `/pages` histórico
 *    (pending). Sin backfill, las predicciones serán vacías hasta tener
 *    al menos 1 año de acumulación prospectiva.
 */

export interface SeasonalPrediction {
  kind: 'entity' | 'category' | 'pattern';
  term: string;
  targetWeek: string; // ISO week key para el que predecimos
  pastWeeks: string[]; // semanas pasadas que justifican la predicción
  pastMentionsAvg: number; // media de menciones/artículos en esas semanas
  nYears: number; // cuántos años aparece (señal de recurrencia)
  confidence: 'high' | 'medium' | 'low';
  /** ¿Está ya caliente ahora mismo? Si sí, la señal es redundante. */
  currentlyHot: boolean;
  /** Top feeds que cubrieron en el pasado */
  pastTopFeeds: string[];
}

interface PredictorOptions {
  /** Weeks tolerance +/- para buscar matches en otros años (default 1 = ±1 semana) */
  weekTolerance?: number;
  /** Min de artículos agregados para considerar que una entidad "explotó" */
  minPastMentions?: number;
  /** Top N por tipo */
  topN?: number;
  /** Target week (default: semana actual) */
  targetWeek?: string;
}

function parseWeekKey(k: string): { year: number; week: number } | null {
  const m = /^(\d{4})-W(\d{2})$/.exec(k);
  if (!m) return null;
  return { year: parseInt(m[1], 10), week: parseInt(m[2], 10) };
}

function formatWeekKey(year: number, week: number): string {
  // Clamp semana entre 1 y 53
  const w = Math.max(1, Math.min(53, week));
  return `${year}-W${String(w).padStart(2, '0')}`;
}

/**
 * Para un targetWeek "2026-W16", devuelve las claves candidatas en años
 * anteriores con tolerancia ±N: 2025-W15, 2025-W16, 2025-W17, 2024-W15, ...
 */
function pastComparables(targetWeek: string, years: number[], tolerance: number): string[] {
  const parsed = parseWeekKey(targetWeek);
  if (!parsed) return [];
  const out: string[] = [];
  for (const y of years) {
    for (let d = -tolerance; d <= tolerance; d++) {
      out.push(formatWeekKey(y, parsed.week + d));
    }
  }
  return out;
}

/** Agrega un WeeklyMediaStats × feedName map a un global del week. */
function aggregateWeek(byFeed: Record<string, WeeklyMediaStats>): {
  totalArticles: number;
  entities: Record<string, number>;
  categories: Record<string, number>;
  patterns: Record<string, number>;
  feedsByTerm: Map<string, Set<string>>;
} {
  const entities: Record<string, number> = {};
  const categories: Record<string, number> = {};
  const patterns: Record<string, number> = {};
  const feedsByTerm = new Map<string, Set<string>>();
  let totalArticles = 0;

  for (const [feedName, s] of Object.entries(byFeed || {})) {
    totalArticles += s.articleCount || 0;
    for (const [e, n] of Object.entries(s.entities || {})) {
      entities[e] = (entities[e] || 0) + n;
      if (!feedsByTerm.has(e)) feedsByTerm.set(e, new Set());
      feedsByTerm.get(e)!.add(feedName);
    }
    for (const [c, n] of Object.entries(s.categories || {})) {
      categories[c] = (categories[c] || 0) + n;
    }
    for (const [p, n] of Object.entries(s.patterns || {})) {
      patterns[p] = (patterns[p] || 0) + n;
    }
  }

  return { totalArticles, entities, categories, patterns, feedsByTerm };
}

/** Top N por count descendente. */
function topN<T extends string>(map: Record<string, number>, n: number): Array<[T, number]> {
  return (Object.entries(map) as Array<[T, number]>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

export function detectSeasonalPredictions(
  state: AppState,
  opts: PredictorOptions = {},
): SeasonalPrediction[] {
  const target = opts.targetWeek || weekKey();
  const weekTolerance = opts.weekTolerance ?? 1;
  const minPastMentions = opts.minPastMentions ?? 10;
  const top = opts.topN ?? 20;

  const history = state.weeklyHistory || {};
  const historyKeys = Object.keys(history);
  if (historyKeys.length === 0) return [];

  const parsedTarget = parseWeekKey(target);
  if (!parsedTarget) return [];

  // Calcular años disponibles en histórico (años anteriores al target)
  const yearsAvailable = new Set<number>();
  for (const k of historyKeys) {
    const p = parseWeekKey(k);
    if (p && p.year < parsedTarget.year) yearsAvailable.add(p.year);
  }
  // Si target es mitad de año y hay datos del año anterior, también incluir
  // el mismo año (pero semanas <= actual)
  const pastYears = [...yearsAvailable].sort((a, b) => b - a);

  if (pastYears.length === 0) return [];

  // Agrupar matches por término: entidad → [{year, count, feeds}]
  type Match = { weekKey: string; year: number; count: number; feeds: string[] };
  const entityMatches = new Map<string, Match[]>();
  const categoryMatches = new Map<string, Match[]>();
  const patternMatches = new Map<string, Match[]>();

  const candidates = pastComparables(target, pastYears, weekTolerance);
  for (const pastWeekKey of candidates) {
    const byFeed = history[pastWeekKey];
    if (!byFeed) continue;
    const agg = aggregateWeek(byFeed);
    const py = parseWeekKey(pastWeekKey)!.year;

    for (const [term, n] of Object.entries(agg.entities)) {
      if (n < minPastMentions) continue;
      if (!entityMatches.has(term)) entityMatches.set(term, []);
      entityMatches.get(term)!.push({
        weekKey: pastWeekKey, year: py, count: n,
        feeds: [...(agg.feedsByTerm.get(term) || [])].slice(0, 5),
      });
    }
    for (const [term, n] of Object.entries(agg.categories)) {
      if (n < minPastMentions) continue;
      if (!categoryMatches.has(term)) categoryMatches.set(term, []);
      categoryMatches.get(term)!.push({ weekKey: pastWeekKey, year: py, count: n, feeds: [] });
    }
    for (const [term, n] of Object.entries(agg.patterns)) {
      if (n < minPastMentions) continue;
      if (!patternMatches.has(term)) patternMatches.set(term, []);
      patternMatches.get(term)!.push({ weekKey: pastWeekKey, year: py, count: n, feeds: [] });
    }
  }

  // ¿Qué está caliente AHORA? (entidades en top del state live)
  const hotEntities = new Set(Object.keys(state.entities || {}).slice(0, 50));

  const predictions: SeasonalPrediction[] = [];

  const build = (
    kind: SeasonalPrediction['kind'],
    matches: Map<string, Match[]>,
    isHot: (term: string) => boolean,
  ) => {
    for (const [term, matchList] of matches) {
      const years = new Set(matchList.map(m => m.year));
      const nYears = years.size;
      const totalCount = matchList.reduce((a, b) => a + b.count, 0);
      const avgCount = Math.round(totalCount / matchList.length);
      const pastWeeks = [...new Set(matchList.map(m => m.weekKey))];
      const pastTopFeeds = [
        ...new Set(matchList.flatMap(m => m.feeds)),
      ].slice(0, 5);
      const confidence: SeasonalPrediction['confidence'] =
        nYears >= 2 ? 'high' : avgCount >= 50 ? 'medium' : 'low';
      predictions.push({
        kind,
        term,
        targetWeek: target,
        pastWeeks,
        pastMentionsAvg: avgCount,
        nYears,
        confidence,
        currentlyHot: isHot(term),
        pastTopFeeds,
      });
    }
  };

  build('entity', entityMatches, t => hotEntities.has(t));
  build('category', categoryMatches, () => false);
  build('pattern', patternMatches, () => false);

  // Ordenar: high confidence > medium > low, luego por pastMentionsAvg
  const confScore = { high: 3, medium: 2, low: 1 };
  predictions.sort((a, b) => {
    const c = confScore[b.confidence] - confScore[a.confidence];
    if (c !== 0) return c;
    return b.pastMentionsAvg - a.pastMentionsAvg;
  });

  // Top N por tipo, con preferencia a las que NO están ya hot
  const byKind: Record<string, SeasonalPrediction[]> = { entity: [], category: [], pattern: [] };
  for (const p of predictions) {
    if (byKind[p.kind].length < top) byKind[p.kind].push(p);
  }
  return [...byKind.entity, ...byKind.category, ...byKind.pattern];
}
