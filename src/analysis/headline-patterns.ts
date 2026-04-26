import { config } from '../config.js';
import { getState, updateState } from '../state/store.js';
import type { DiscoverPage, HeadlinePatternAlert } from '../types.js';

const SPANISH_STOPWORDS = new Set([
  // Artículos + preposiciones + conjunciones core
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'al', 'del',
  'de', 'en', 'y', 'o', 'que', 'es', 'por', 'con', 'para', 'como',
  'se', 'su', 'sus', 'le', 'les', 'lo', 'mas', 'ya', 'no', 'si',
  'ha', 'han', 'fue', 'ser', 'este', 'esta', 'estos', 'estas', 'ese',
  'esa', 'esos', 'esas', 'pero', 'sin', 'sobre', 'entre', 'hasta',
  'desde', 'muy', 'todo', 'toda', 'todos', 'todas', 'otro', 'otra',
  'otros', 'otras', 'cual', 'cuando', 'donde', 'quien', 'hay', 'ser',

  // Verbos comunes (todas las formas)
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

  // Verbos editoriales (curado de titulares Discover ES)
  'tras', 'porque', 'según', 'segun', 'aunque', 'mientras', 'pese',
  'supone', 'señala', 'senala', 'asegura', 'apunta', 'considera',
  'avisa', 'advierte', 'desvela', 'revela', 'descubre', 'explica',
  'cuenta', 'admite', 'reconoce', 'confiesa', 'critica', 'defiende',
  'opina', 'propone', 'plantea', 'cree', 'habla',

  // Verbos clickbait/curiosity-gap
  'arrasa', 'estalla', 'explota', 'desata', 'sacude', 'revoluciona',
  'sorprende', 'impacta', 'conmociona', 'enfada', 'enciende',

  // Pronombres / cuantificadores
  'nos', 'me', 'te', 'les', 'mi', 'tu', 'ella', 'ellos', 'ellas',
  'vos', 'nosotros', 'vosotros', 'usted', 'ustedes',
  'aqui', 'ahi', 'alli', 'asi', 'bien', 'mal', 'mejor', 'peor',
  'mucho', 'poco', 'antes', 'despues', 'ahora', 'hoy', 'ayer',
  'manana', 'siempre', 'nunca', 'tambien', 'solo', 'mas', 'menos',
  'algo', 'alguno', 'alguna', 'ningun', 'nadie', 'nada', 'cada',
  'qué', 'cómo', 'dónde', 'cuándo', 'cuánto', 'cuánta', 'qué',

  // Connectores discurso editorial
  'porqué', 'porque', 'mientras', 'aunque', 'pese', 'cabe', 'caben',
  'tampoco', 'incluso', 'casi', 'apenas', 'cerca', 'fuera',
  'dentro', 'frente', 'durante', 'antes', 'detrás', 'detras',

  // Genéricos sin valor + locuciones comunes
  'gente', 'persona', 'personas', 'cosa', 'cosas', 'forma', 'formas',
  'parte', 'partes', 'caso', 'casos', 'tema', 'temas', 'vez', 'veces',
  'lado', 'lados', 'tipo', 'tipos', 'manera', 'maneras',
  'momento', 'momentos', 'hora', 'horas', 'día', 'dia', 'días', 'dias',
  'año', 'ano', 'años', 'anos',

  // Inglés que aparece en titulares ES (Lo + Trump etc.)
  'the', 'and', 'for', 'that', 'with', 'this', 'from', 'are', 'was',
  'has', 'have', 'not', 'but', 'its', 'his', 'her', 'they', 'been',
  'will', 'would', 'should', 'could', 'about', 'after', 'over',
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

  // Threshold dinámico: el de config (default 3) decide CUÁNDO se persiste el
  // ngram en state.headlinePatterns. Para emitir ALERTA de patrón usamos un
  // umbral más permisivo (alertMin=2): así detectamos n-gramas que aparecen
  // en ≥2 titulares aunque el config base esté en 3. Y eliminamos la condición
  // 'count > prevCount' (era restrictiva: si un patrón se mantiene estable
  // poll tras poll no disparaba alerta nueva, perdíamos señal de saturación).
  const minPersist = config.thresholds.headlineMinFrequency;
  const minAlert = Math.max(2, Math.min(minPersist, 2));

  for (const [ngram, { count, titles }] of ngramData) {
    if (count < minPersist) continue;
    nextPatterns[ngram] = count;
  }

  // Alertas: emitimos cuando count >= minAlert AND es nuevo (no estaba en prev)
  // o ha crecido al menos 1 unidad. Esto captura tanto ngramas emergentes
  // como saturación editorial activa.
  for (const [ngram, { count, titles }] of ngramData) {
    if (count < minAlert) continue;
    const prevCount = prevPatterns[ngram] ?? 0;
    const isNew = prevCount === 0;
    const grew = count > prevCount;
    if (!isNew && !grew) continue;
    alerts.push({
      type: 'headline_pattern',
      ngram,
      count,
      prevCount,
      matchingTitles: [...titles].slice(0, 5),
    });
  }

  // Append current poll patterns to the rolling history (30-day window).
  // Cap a 50k entries; si se pasa, priorizamos los más recientes.
  const now = new Date().toISOString();
  const nowMs = Date.now();
  const historyWindowMs = 30 * 24 * 3600_000;
  const prevHistory = state.headlinePatternsHistory ?? [];
  const prunedHistory = prevHistory.filter(
    h => nowMs - new Date(h.timestamp).getTime() <= historyWindowMs,
  );
  const newEntries = Object.entries(nextPatterns).map(([ngram, count]) => ({
    ngram,
    count,
    timestamp: now,
  }));
  const combinedHistory = [...prunedHistory, ...newEntries].slice(-50_000);

  updateState({
    headlinePatterns: nextPatterns,
    headlinePatternsHistory: combinedHistory,
  });
  return alerts;
}
