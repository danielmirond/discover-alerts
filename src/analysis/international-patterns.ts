/**
 * Análisis editorial de titulares internacionales por país.
 *
 * Para cada país recolectado por `runInternationalPoll`, extraemos:
 *  - Publishers: dominios agregados con sus titulares (qué medios mandan en
 *    cada mercado y qué publican)
 *  - Trigramas: n-gramas top en titulares (3-5 palabras) con stopwords
 *    multilingües
 *  - Fórmulas: estructuras editoriales recurrentes detectadas por regex
 *    (preguntas, listicles, comparativas, after/tras, citas…)
 *
 * Cómputo en demanda en `api/international.ts` — barato (~30 pages × 13 países).
 * Objetivo: que el redactor de ED detecte oportunidades editoriales viendo
 * con qué fórmulas y temas mandan los medios internacionales en /Sports.
 */

import type { InternationalCountrySnap } from '../polling/international-poll.js';

// Stopwords multilingües minimal — ES + EN + IT + FR + PT + DE.
// Concentradas en artículos, preposiciones, auxiliares y conectores muy
// frecuentes. No tan exhaustivo como el set ES de headline-patterns, pero
// suficiente para que los trigramas internacionales sean legibles.
const MULTILANG_STOPWORDS = new Set([
  // ES
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'al', 'del',
  'de', 'en', 'y', 'o', 'que', 'es', 'por', 'con', 'para', 'como',
  'se', 'su', 'sus', 'le', 'les', 'lo', 'mas', 'mas', 'ya', 'no', 'si',
  'tras', 'desde', 'hasta', 'sobre', 'entre', 'cuando', 'donde',
  // EN
  'the', 'and', 'for', 'that', 'with', 'this', 'from', 'are', 'was',
  'has', 'have', 'his', 'her', 'they', 'their', 'will', 'would',
  'about', 'after', 'over', 'into', 'than', 'then', 'just', 'all',
  'who', 'why', 'how', 'what', 'where', 'when', 'will', 'can', 'cant',
  'but', 'not', 'its', 'our', 'out', 'now', 'off', 'amid', 'before',
  // IT
  'il', 'lo', 'gli', 'di', 'che', 'una', 'uno', 'sono', 'come',
  'non', 'piu', 'per', 'con', 'su', 'da', 'in', 'tra', 'fra',
  'questo', 'questa', 'sua', 'suo', 'loro',
  // FR
  'les', 'des', 'avec', 'pour', 'dans', 'sur', 'pas', 'sont', 'ont',
  'cette', 'cet', 'ses', 'son', 'leur', 'leurs', 'tout', 'tous',
  'apres', 'avant', 'sans', 'mais', 'plus', 'moins',
  // PT
  'os', 'as', 'no', 'na', 'nos', 'nas', 'do', 'dos', 'das', 'pelo',
  'pela', 'pelos', 'pelas', 'sobre', 'entre', 'sem', 'sob',
  // DE
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen',
  'und', 'oder', 'aber', 'mit', 'auf', 'fur', 'fuer', 'von', 'zum',
  'zur', 'ist', 'sind', 'war', 'werden', 'wurde', 'wird', 'hat',
  'haben', 'sein', 'sich', 'wie', 'nach', 'vor', 'beim',
  // Numbers/dates noise
  'hoy', 'ayer', 'today', 'yesterday', 'oggi', 'ieri', 'aujourdhui',
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !MULTILANG_STOPWORDS.has(w));
}

function ngrams(words: string[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + n <= words.length; i++) out.push(words.slice(i, i + n).join(' '));
  return out;
}

export interface PublisherSummary {
  domain: string;
  publisher?: string;
  count: number;
  /** Top 3 titulares más relevantes (por score Discover). */
  titles: string[];
  /** Score Discover medio. */
  avgScore: number;
}

export interface TrigramHit {
  ngram: string;
  count: number;
  examples: string[];
}

export interface FormulaHit {
  formula: string;
  label: string;
  count: number;
  examples: string[];
}

// ────────────────────────────────────────────────────────────────────────────
// Fórmulas estructurales — buscan templates editoriales recurrentes en el
// mercado deportivo internacional. Regex aplicada al titular en bruto.
// Cada hit incluye el titular completo como evidencia.
// ────────────────────────────────────────────────────────────────────────────
const FORMULAS: Array<{ id: string; label: string; re: RegExp }> = [
  // Pregunta directa al lector
  { id: 'pregunta',     label: 'Pregunta directa',     re: /^\s*(¿|why|how|will|is|are|can|should|would|comment|perché|perche|pourquoi|warum|porque|por qué|cómo|como|qué|que)\b/i },
  // Listicle "N + sustantivo"
  { id: 'listicle',     label: 'Listicle (N cosas)',   re: /^\s*\d{1,2}\s+\w/i },
  // "X: Y" — los dos puntos como gancho
  { id: 'dos-puntos',   label: 'Gancho con ":"',        re: /^[^:]{6,40}:\s+\w/i },
  // Cita entrecomillada — "X dice: 'Y'"
  { id: 'cita',         label: 'Cita entrecomillada',   re: /["“«][^"”»]{6,80}["”»]/ },
  // After / Tras / Dopo — secuela
  { id: 'despues-de',   label: 'After / Tras / Dopo',   re: /\b(after|tras|dopo|nach|apres|après|depois)\b/i },
  // X vs Y — comparativa
  { id: 'versus',       label: 'Comparativa (vs)',      re: /\b(vs\.?|versus|contra|gegen|contre)\b/i },
  // Confirmado / oficial / breaking
  { id: 'urgencia',     label: 'Urgencia / breaking',   re: /\b(breaking|confirmed|oficial|official|ufficiale|officiel|amtlich|confirmado|ufficiale)\b/i },
  // Why X — explicativo
  { id: 'porque',       label: 'Explicativo (why/perché)', re: /^\s*(why|perché|perche|pourquoi|por qué|por que|warum)\b/i },
  // How to / Cómo
  { id: 'how-to',       label: 'How-to / Cómo',         re: /^\s*(how to|come|comment|cómo|como|wie man)\b/i },
  // From X to Y — narrativa de transformación
  { id: 'from-to',      label: 'From X to Y',           re: /\bfrom\b[^.!?]{3,50}\bto\b/i },
  // Best / Top / The X best
  { id: 'top-best',     label: 'Top / Best',            re: /\b(top \d+|best \d+|los mejores|i migliori|les meilleurs|os melhores)\b/i },
  // X reveals / X says — declaración atribuida
  { id: 'declaracion',  label: 'Declaración atribuida', re: /\b(reveals?|says?|tells?|admits?|dice|dichiara|déclare|sagt|afirma|confiesa|asegura)\b/i },
  // Number-driven: Y goals, X points, X yards, Z assist
  { id: 'cifra-data',   label: 'Cifra concreta (goles/puntos)', re: /\b\d{1,4}\s+(goals?|points?|assists?|yards?|wins?|losses?|games?|goles|puntos|asistencias|partidos|victorias|derrotas|punti|gol|reti|points|buts|tore|punkte)\b/i },
];

export interface CountryAnalysis {
  publishers: PublisherSummary[];
  trigrams: TrigramHit[];
  formulas: FormulaHit[];
}

export function analyzeCountry(snap: InternationalCountrySnap | null | undefined): CountryAnalysis {
  if (!snap || !snap.pages || snap.pages.length === 0) {
    return { publishers: [], trigrams: [], formulas: [] };
  }
  const pages = snap.pages;

  // ── Publishers ───────────────────────────────────────────────────────────
  const pubAgg = new Map<string, { titles: { title: string; score: number }[]; scoreSum: number; publisher?: string }>();
  for (const p of pages) {
    const dom = (p.domain || p.publisher || '').replace(/^www\./, '').toLowerCase();
    if (!dom) continue;
    let entry = pubAgg.get(dom);
    if (!entry) { entry = { titles: [], scoreSum: 0, publisher: p.publisher }; pubAgg.set(dom, entry); }
    entry.titles.push({ title: p.title || '', score: p.score || 0 });
    entry.scoreSum += p.score || 0;
  }
  const publishers: PublisherSummary[] = [...pubAgg.entries()]
    .map(([domain, v]) => ({
      domain,
      publisher: v.publisher,
      count: v.titles.length,
      avgScore: Math.round(v.scoreSum / v.titles.length),
      titles: v.titles.sort((a, b) => b.score - a.score).slice(0, 3).map(t => t.title).filter(Boolean),
    }))
    .sort((a, b) => b.count - a.count || b.avgScore - a.avgScore)
    .slice(0, 15);

  // ── Trigramas (3-5 palabras) ─────────────────────────────────────────────
  const ngAgg = new Map<string, { count: number; examples: Set<string> }>();
  for (const p of pages) {
    const t = (p.title || '').trim();
    if (!t) continue;
    const tokens = tokenize(t);
    for (const n of [3, 4, 5]) {
      for (const g of ngrams(tokens, n)) {
        let e = ngAgg.get(g);
        if (!e) { e = { count: 0, examples: new Set() }; ngAgg.set(g, e); }
        e.count++;
        if (e.examples.size < 3) e.examples.add(t);
      }
    }
  }
  // Filtrar: solo n-gramas con ≥2 apariciones, ordenar por count desc, luego longitud.
  const trigrams: TrigramHit[] = [...ngAgg.entries()]
    .filter(([, v]) => v.count >= 2)
    .map(([ngram, v]) => ({ ngram, count: v.count, examples: [...v.examples] }))
    .sort((a, b) => b.count - a.count || b.ngram.split(' ').length - a.ngram.split(' ').length)
    .slice(0, 15);

  // ── Fórmulas estructurales ───────────────────────────────────────────────
  const formulas: FormulaHit[] = FORMULAS.map(f => {
    const examples: string[] = [];
    let count = 0;
    for (const p of pages) {
      const t = (p.title || '').trim();
      if (!t) continue;
      if (f.re.test(t)) {
        count++;
        if (examples.length < 3) examples.push(t);
      }
    }
    return { formula: f.id, label: f.label, count, examples };
  }).filter(f => f.count >= 1).sort((a, b) => b.count - a.count);

  return { publishers, trigrams, formulas };
}
