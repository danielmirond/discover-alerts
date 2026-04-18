import { config } from '../config.js';
import { getState, updateState } from '../state/store.js';
import type { DiscoverPage, HeadlinePatternAlert } from '../types.js';

const SPANISH_STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'al', 'del',
  'de', 'en', 'y', 'o', 'que', 'es', 'por', 'con', 'para', 'como',
  'se', 'su', 'sus', 'le', 'les', 'lo', 'mas', 'ya', 'no', 'si',
  'ha', 'han', 'fue', 'ser', 'este', 'esta', 'estos', 'estas', 'ese',
  'esa', 'esos', 'esas', 'pero', 'sin', 'sobre', 'entre', 'hasta',
  'desde', 'muy', 'todo', 'toda', 'todos', 'todas', 'otro', 'otra',
  'otros', 'otras', 'cual', 'cuando', 'donde', 'quien', 'hay', 'ser',
  'estar', 'tener', 'hacer', 'poder', 'decir', 'ir', 'ver', 'dar',
  'saber', 'querer', 'llegar', 'pasar', 'deber', 'poner', 'parecer',
  'quedar', 'creer', 'hablar', 'llevar', 'dejar', 'seguir', 'encontrar',
  'llamar', 'venir', 'pensar', 'salir', 'volver', 'tomar', 'conocer',
  'vivir', 'sentir', 'tratar', 'mirar', 'contar', 'empezar', 'esperar',
  'buscar', 'existir', 'entrar', 'trabajar', 'escribir', 'perder',
  'producir', 'ocurrir', 'entender', 'pedir', 'recibir', 'recordar',
  'terminar', 'permitir', 'aparecer', 'conseguir', 'comenzar',
  'servir', 'sacar', 'necesitar', 'mantener', 'resultar', 'leer',
  'caer', 'cambiar', 'presentar', 'crear', 'abrir', 'considerar',
  'ofrecer', 'partir', 'acabar', 'ganar', 'formar', 'traer',
  'nos', 'me', 'te', 'les', 'mi', 'tu', 'ella', 'ellos', 'ellas',
  'nos', 'vos', 'nosotros', 'vosotros', 'usted', 'ustedes',
  'aqui', 'ahi', 'alli', 'asi', 'bien', 'mal', 'mejor', 'peor',
  'mucho', 'poco', 'antes', 'despues', 'ahora', 'hoy', 'ayer',
  'manana', 'siempre', 'nunca', 'tambien', 'solo', 'mas', 'menos',
  'the', 'and', 'for', 'that', 'with', 'this', 'from', 'are', 'was',
  'has', 'have', 'not', 'but', 'its', 'his', 'her', 'they', 'been',
]);

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !SPANISH_STOPWORDS.has(w));
}

function generateNgrams(words: string[], n: number): string[] {
  const result: string[] = [];
  for (let i = 0; i <= words.length - n; i++) {
    result.push(words.slice(i, i + n).join(' '));
  }
  return result;
}

export function detectHeadlinePatterns(pages: DiscoverPage[]): HeadlinePatternAlert[] {
  const state = getState();
  const prevPatterns = state.headlinePatterns;
  const ngramData = new Map<string, { count: number; titles: Set<string> }>();

  for (const page of pages) {
    const title = page.title || page.title_original || '';
    if (!title) continue;

    const words = normalize(title);
    // Only 3+ word n-grams: trigrams, 4-grams, 5-grams
    const trigrams = generateNgrams(words, 3);
    const fourgrams = generateNgrams(words, 4);
    const fivegrams = generateNgrams(words, 5);

    for (const ngram of [...trigrams, ...fourgrams, ...fivegrams]) {
      let entry = ngramData.get(ngram);
      if (!entry) {
        entry = { count: 0, titles: new Set() };
        ngramData.set(ngram, entry);
      }
      entry.count++;
      entry.titles.add(title);
    }
  }

  const alerts: HeadlinePatternAlert[] = [];
  const nextPatterns: Record<string, number> = {};

  for (const [ngram, { count, titles }] of ngramData) {
    if (count < config.thresholds.headlineMinFrequency) continue;

    nextPatterns[ngram] = count;
    const prevCount = prevPatterns[ngram] ?? 0;

    if (count > prevCount) {
      alerts.push({
        type: 'headline_pattern',
        ngram,
        count,
        prevCount,
        matchingTitles: [...titles].slice(0, 5),
      });
    }
  }

  // Append current poll patterns to the rolling history (4-day window)
  const now = new Date().toISOString();
  const nowMs = Date.now();
  const historyWindowMs = 4 * 24 * 3600_000;
  const prevHistory = state.headlinePatternsHistory ?? [];
  const prunedHistory = prevHistory.filter(
    h => nowMs - new Date(h.timestamp).getTime() <= historyWindowMs,
  );
  const newEntries = Object.entries(nextPatterns).map(([ngram, count]) => ({
    ngram,
    count,
    timestamp: now,
  }));
  // Cap total history at 10k entries to avoid unbounded Redis growth
  const combinedHistory = [...prunedHistory, ...newEntries].slice(-10_000);

  updateState({
    headlinePatterns: nextPatterns,
    headlinePatternsHistory: combinedHistory,
  });
  return alerts;
}
