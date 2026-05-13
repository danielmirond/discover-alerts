/**
 * Auditor de texto: detecta patrones característicos de redacción asistida por
 * IA y muletillas que Google penaliza (Helpful Content / E-E-A-T) y que el
 * lector identifica como "texto plástico".
 *
 * Pensado para la metodología "doble IA" — Claude construye, ChatGPT audita.
 * Este detector es la versión local y heurística; el redactor lo usa ANTES de
 * pasar el texto por ChatGPT para no quemar tokens en lo obvio.
 *
 * Reglas extraídas de observación de salidas reales de GPT-4/Claude en ES
 * y de las quejas habituales en redacciones (Sports Illustrated, Gannett,
 * The Atlantic): sobreabundancia de conectores, rayas medias decorativas,
 * estructura paralela rítmica, adjetivos abstractos en cluster.
 *
 * No es un detector probabilístico (no usamos perplejidad). Son reglas
 * objetivas y explicables — el redactor puede contraargumentar.
 */
export type AuditSeverity = 'low' | 'medium' | 'high';

export interface TextAuditIssue {
  rule: string;
  severity: AuditSeverity;
  message: string;
  count?: number;
  examples?: string[];
  suggestion?: string;
}

export interface TextAuditResult {
  /** Texto auditado tal cual. */
  text: string;
  /** Palabras totales (split en whitespace). */
  wordCount: number;
  /** Frases totales (split en . ! ? …). */
  sentenceCount: number;
  /** Score 0-100. >= 75 humano, 50-74 revisar, < 50 reescribir. */
  score: number;
  verdict: 'humano' | 'revisar' | 'reescribir';
  /** Issues detectados. */
  issues: TextAuditIssue[];
  /** Aciertos del texto (no penalizan, refuerzan score). */
  positives: string[];
}

// ────────────────────────────────────────────────────────────────────────────
// Diccionarios — extraídos de observación real de salidas IA en castellano
// ────────────────────────────────────────────────────────────────────────────

// Muletillas conectoras típicas de GPT/Claude. Una o dos en un texto largo no
// es alarma; cuatro o más SÍ lo es.
const MULETILLAS_CONECTORAS = [
  'cabe destacar', 'cabe señalar', 'cabe mencionar', 'cabe resaltar',
  'es importante señalar', 'es importante destacar', 'es importante mencionar',
  'vale la pena mencionar', 'vale la pena destacar', 'merece la pena',
  'sin duda', 'sin lugar a dudas', 'indudablemente',
  'en definitiva', 'en resumen', 'en conclusión', 'en última instancia',
  'no obstante', 'asimismo', 'por consiguiente', 'por ende',
  'en este sentido', 'en este contexto', 'en este marco', 'en este aspecto',
  'a su vez', 'a la par', 'paralelamente',
  'dicho esto', 'dicho lo cual', 'dicho lo anterior',
  'a tener en cuenta', 'a considerar', 'a destacar',
  'es relevante', 'es fundamental tener en cuenta',
  'cabe preguntarse', 'cabe recordar',
];

// Adjetivos abstractos que GPT/Claude usa en cluster ("una decisión
// crucial, significativa y fundamental"). Uno suelto está bien; tres juntos
// en un párrafo es síntoma.
const ADJETIVOS_ABSTRACTOS = [
  'crucial', 'cruciales',
  'significativo', 'significativa', 'significativos', 'significativas',
  'fundamental', 'fundamentales',
  'esencial', 'esenciales',
  'relevante', 'relevantes',
  'transcendental', 'transcendentales', 'transcendente',
  'vital', 'vitales',
  'imprescindible', 'imprescindibles',
  'paradigmático', 'paradigmática',
  'multifacético', 'multifacética',
  'innovador', 'innovadora', 'innovadores', 'innovadoras',
  'pionero', 'pionera',
  'robusto', 'robusta',
  'integral', 'integrales',
];

// Cierres tipo "en última instancia / al fin y al cabo" que GPT abusa en la
// frase final del último párrafo.
const CIERRES_PLASTICOS = [
  'en última instancia',
  'al fin y al cabo',
  'a fin de cuentas',
  'en definitiva',
  'en resumidas cuentas',
  'al final del día',
  'el tiempo dirá',
  'queda por ver',
  'el futuro nos dirá',
  'solo el tiempo lo dirá',
];

// Frases de "hedge" típicas IA — diluyen la afirmación.
const HEDGES = [
  'podría considerarse', 'se podría decir', 'se podría afirmar',
  'cabría argumentar', 'podría argumentarse',
  'algunos consideran', 'muchos opinan', 'hay quien sostiene',
  'tradicionalmente se ha considerado',
];

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  const re = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
  return (haystack.match(re) || []).length;
}

/** Detecta tres o más frases consecutivas con la MISMA estructura sintáctica
 * inicial (e.g. "Por un lado, X. Por otro lado, Y. Asimismo, Z."). GPT
 * compone rítmicamente; los humanos varían apertura. */
function detectStructuralParallelism(sentences: string[]): { count: number; examples: string[] } {
  const openers: string[] = sentences.map(s => {
    const norm = normalize(s.trim());
    const words = norm.split(/\s+/).slice(0, 3).join(' ');
    return words;
  });
  let runs = 0;
  const examples: string[] = [];
  for (let i = 2; i < openers.length; i++) {
    // Tres consecutivos con first-word igual O conector estándar parecido
    const a = openers[i - 2].split(' ')[0];
    const b = openers[i - 1].split(' ')[0];
    const c = openers[i].split(' ')[0];
    if (a === b && b === c && a.length >= 3) {
      runs++;
      if (examples.length < 2) examples.push(`"${a}..." x3 consecutivas`);
    }
  }
  return { count: runs, examples };
}

export function auditText(text: string): TextAuditResult {
  const issues: TextAuditIssue[] = [];
  const positives: string[] = [];
  const trimmed = (text || '').trim();

  if (trimmed.length === 0) {
    return {
      text: '', wordCount: 0, sentenceCount: 0, score: 0, verdict: 'reescribir',
      issues: [{ rule: 'empty', severity: 'high', message: 'Texto vacío.' }],
      positives: [],
    };
  }

  const norm = normalize(trimmed);
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const sentences = trimmed.split(/[.!?…]+/).map(s => s.trim()).filter(s => s.length > 0);
  const sentenceCount = sentences.length;
  const paragraphs = trimmed.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  // ── 1. Muletillas conectoras ─────────────────────────────────────────────
  const muletillasFound: { phrase: string; count: number }[] = [];
  let muletillasTotal = 0;
  for (const m of MULETILLAS_CONECTORAS) {
    const c = (norm.match(new RegExp(m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (c > 0) {
      muletillasFound.push({ phrase: m, count: c });
      muletillasTotal += c;
    }
  }
  if (muletillasTotal >= 4) {
    issues.push({
      rule: 'muletillas-cluster',
      severity: 'high',
      count: muletillasTotal,
      message: `${muletillasTotal} muletillas conectoras típicas de IA.`,
      examples: muletillasFound.slice(0, 4).map(m => `"${m.phrase}" ×${m.count}`),
      suggestion: 'Eliminar "cabe destacar", "sin duda", "en definitiva". El lector lo nota.',
    });
  } else if (muletillasTotal >= 2) {
    issues.push({
      rule: 'muletillas',
      severity: 'medium',
      count: muletillasTotal,
      message: `${muletillasTotal} muletillas detectadas.`,
      examples: muletillasFound.slice(0, 3).map(m => `"${m.phrase}"`),
      suggestion: 'Mantener máximo 1 por texto.',
    });
  }

  // ── 2. Rayas medias (em-dash) abusivas ───────────────────────────────────
  // GPT usa "—" como recurso retórico decorativo. >3 por cada 300 palabras = bandera.
  const emDashCount = (trimmed.match(/—/g) || []).length;
  const emDashPer300 = wordCount > 0 ? (emDashCount * 300) / wordCount : 0;
  if (emDashCount >= 3 && emDashPer300 >= 3) {
    issues.push({
      rule: 'em-dash-abuse',
      severity: 'medium',
      count: emDashCount,
      message: `${emDashCount} rayas medias (—) en ${wordCount} palabras. Densidad ${emDashPer300.toFixed(1)}/300w.`,
      suggestion: 'Sustituir por comas, paréntesis o punto. La raya media es el tic más reconocible de IA.',
    });
  }

  // ── 3. Adjetivos abstractos en cluster ───────────────────────────────────
  const adjsFound: { word: string; count: number }[] = [];
  let adjsTotal = 0;
  for (const adj of ADJETIVOS_ABSTRACTOS) {
    const c = countOccurrences(norm, adj);
    if (c > 0) {
      adjsFound.push({ word: adj, count: c });
      adjsTotal += c;
    }
  }
  if (adjsTotal >= 4) {
    issues.push({
      rule: 'adjetivos-cluster',
      severity: 'high',
      count: adjsTotal,
      message: `${adjsTotal} adjetivos abstractos vacíos (crucial, fundamental, significativo…).`,
      examples: adjsFound.slice(0, 4).map(a => `"${a.word}" ×${a.count}`),
      suggestion: 'Cambiar por adjetivos concretos o suprimir. "Crucial" no dice nada.',
    });
  } else if (adjsTotal >= 2) {
    issues.push({
      rule: 'adjetivos',
      severity: 'low',
      count: adjsTotal,
      message: `${adjsTotal} adjetivos abstractos. Vigilar densidad.`,
      examples: adjsFound.slice(0, 3).map(a => `"${a.word}"`),
    });
  }

  // ── 4. Cierres plásticos ─────────────────────────────────────────────────
  const lastPara = paragraphs[paragraphs.length - 1] || '';
  const lastNorm = normalize(lastPara);
  const cierreHit = CIERRES_PLASTICOS.find(c => lastNorm.includes(c));
  if (cierreHit) {
    issues.push({
      rule: 'cierre-plastico',
      severity: 'medium',
      message: `Cierre tipo "${cierreHit}" — fórmula típica IA.`,
      suggestion: 'Cerrar con dato concreto, próximo paso o pregunta abierta real.',
    });
  }

  // ── 5. Paralelismo estructural ───────────────────────────────────────────
  const par = detectStructuralParallelism(sentences);
  if (par.count >= 1) {
    issues.push({
      rule: 'paralelismo',
      severity: par.count >= 2 ? 'medium' : 'low',
      count: par.count,
      message: `Estructura paralela rítmica detectada.`,
      examples: par.examples,
      suggestion: 'Variar apertura de frase. Los humanos escribimos con ritmo irregular.',
    });
  }

  // ── 6. Hedges (diluyentes) ───────────────────────────────────────────────
  const hedgeHits = HEDGES.filter(h => norm.includes(h));
  if (hedgeHits.length >= 2) {
    issues.push({
      rule: 'hedges',
      severity: 'low',
      count: hedgeHits.length,
      message: `${hedgeHits.length} expresiones de hedging.`,
      examples: hedgeHits.slice(0, 2).map(h => `"${h}"`),
      suggestion: 'Afirmar o citar fuente. "Podría considerarse" diluye la información.',
    });
  }

  // ── 7. Longitud media de frase (IA tiende a frases largas y uniformes) ──
  if (sentenceCount >= 5) {
    const lens = sentences.map(s => s.split(/\s+/).length);
    const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
    const variance = lens.reduce((s, l) => s + Math.pow(l - avg, 2), 0) / lens.length;
    const stdev = Math.sqrt(variance);
    if (avg > 25 && stdev < 6) {
      issues.push({
        rule: 'frases-uniformes',
        severity: 'medium',
        message: `Frases largas y uniformes (avg ${avg.toFixed(0)} palabras, stdev ${stdev.toFixed(1)}).`,
        suggestion: 'Mezclar frases cortas y largas. La uniformidad delata redacción asistida.',
      });
    }
  }

  // ── 8. Repetición de "tanto X como Y" / "no solo X, sino también Y" ─────
  const tantoComo = (norm.match(/\btanto\s+\w+\s+como\b/g) || []).length;
  const noSolo = (norm.match(/\bno solo\s+[\w\s]{1,40}\s+sino\b/g) || []).length;
  if (tantoComo + noSolo >= 2) {
    issues.push({
      rule: 'tanto-como',
      severity: 'low',
      count: tantoComo + noSolo,
      message: '"Tanto X como Y" / "No solo X sino Y" usados varias veces. Recurso IA muy típico.',
    });
  }

  // ── POSITIVES ────────────────────────────────────────────────────────────
  if (/\d{1,3}([.,]\d+)?\s*(€|euros|%|millones|m€)/i.test(trimmed)) positives.push('Contiene cifras concretas');
  if (/[«»"][^«»"]{8,200}[«»"]/.test(trimmed)) positives.push('Contiene cita entrecomillada');
  // Frases cortas + largas mezcladas
  if (sentenceCount >= 4) {
    const lens = sentences.map(s => s.split(/\s+/).length);
    const shortCount = lens.filter(l => l <= 8).length;
    const longCount = lens.filter(l => l >= 25).length;
    if (shortCount >= 1 && longCount >= 1) positives.push('Mezcla frases cortas y largas');
  }
  if (paragraphs.length >= 3 && paragraphs.length <= 8) positives.push('Estructura párrafos equilibrada');

  // ── SCORE ────────────────────────────────────────────────────────────────
  let score = 100;
  for (const i of issues) {
    score -= i.severity === 'high' ? 25 : i.severity === 'medium' ? 12 : 5;
  }
  score += positives.length * 3;
  score = Math.max(0, Math.min(100, score));
  const verdict: TextAuditResult['verdict'] = score >= 75 ? 'humano' : score >= 50 ? 'revisar' : 'reescribir';

  return { text: trimmed, wordCount, sentenceCount, score, verdict, issues, positives };
}
