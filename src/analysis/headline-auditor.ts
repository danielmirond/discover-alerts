/**
 * Auditor de titulares pre-publicación.
 *
 * Aplica reglas extraídas del research 1492.vision sobre cómo Discover
 * selecciona contenido en mercados FR/ES (similares en pipeline weights).
 *
 * Devuelve:
 *  - score 0-100 ("Discover-friendly")
 *  - issues detectados con severidad
 *  - sugerencias de reescritura cuando aplica
 *
 * No es prescriptivo: el redactor decide. Es una ayuda objetiva.
 */

export type AuditSeverity = 'low' | 'medium' | 'high';

export interface AuditIssue {
  rule: string;
  severity: AuditSeverity;
  message: string;
  suggestion?: string;
}

export interface AuditResult {
  headline: string;
  score: number;
  verdict: 'good' | 'review' | 'rewrite';
  length: number;
  issues: AuditIssue[];
  positives: string[];
}

// Palabras clickbait que Discover penaliza activamente (research FR/ES)
const CLICKBAIT_HARD = [
  'arrasa', 'arrasan', 'explota', 'estalla', 'reventar', 'revientan',
  'no te creerás', 'flipante', 'increíble', 'brutal', 'demoledor',
  'el motivo te sorprenderá', 'no te lo vas a creer', 'lo que pasó después',
  'cierran la boca', 'pone los pelos de punta', 'esto cambia todo',
  'la verdad oculta', 'lo que nadie te ha contado', 'jamás imaginarás',
];

// Muletillas IA reconocibles en titular (en cuerpo se audita aparte).
// Un titular con "cabe destacar" o "sin duda" huele a IA y/o a opinión vacía.
const AI_TELLS_HEADLINE = [
  'cabe destacar', 'cabe señalar', 'cabe mencionar',
  'sin duda', 'sin lugar a dudas',
  'en definitiva', 'en resumidas cuentas',
  'es importante señalar', 'es importante destacar',
  'no obstante', 'asimismo',
];

// Palabras vacías estilo "esto/eso/lo que"
const VAGUE_OPENERS = [
  'esto', 'eso', 'lo que', 'el motivo', 'la razón', 'la verdad',
  'lo único', 'el secreto', 'la clave',
];

// Verbos editoriales de acción (research: titulares con verbo principal funcionan mejor)
const ACTION_VERBS = new Set([
  'anuncia','anuncian','asegura','aseguran','confirma','confirman','denuncia','denuncian',
  'advierte','advierten','revela','revelan','pide','piden','exige','exigen','propone','proponen',
  'niega','niegan','descarta','descartan','condena','condenan','aprueba','aprueban','rechaza','rechazan',
  'gana','ganan','pierde','pierden','muere','mueren','ficha','fichan','dimite','dimiten','renuncia','renuncian',
  'compra','compran','vende','venden','firma','firman','encuentra','encuentran','halla','hallan',
  'detiene','detienen','arrestan','arresta','rescata','rescatan','salva','salvan','abre','abren','cierra','cierran',
  'declara','declaran','vota','votan','decide','deciden','presenta','presentan','marca','marcan','golpea','golpean',
  'bloquea','bloquean','suspende','suspenden','aplaza','aplazan','cancela','cancelan','estrena','estrenan',
  'lanza','lanzan','presenta','revela','sugiere','sugieren','propone','proponen','plantea','plantean',
]);

// Lista canonica de stopwords ES para detectar entidades
const STOPWORDS_ES = new Set([
  'el','la','los','las','un','una','de','en','y','o','que','es','por','con','para','como','se','su','sus',
  'le','les','lo','del','al','este','esta','estos','estas','ese','esa','pero','sin','sobre','entre','tras',
  'desde','muy','todo','toda','primer','último','solo','tan','también','aún','mientras','cuando','donde',
  'quien','cual','según','contra','hace','ha','han','hay','será','fue','ante','sino','año','años','meses','día',
]);

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Heurística de entidad: ≥1 palabra capitalizada que no sea stopword/inicio. */
function detectsEntity(headline: string): boolean {
  // Tokens originales (sin lowercase). Una entidad típica empieza por mayúscula EN MEDIO o final.
  const tokens = headline.split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i].replace(/[^A-Za-zÀ-ÿ]/g, '');
    if (t.length < 3) continue;
    if (i === 0) continue; // primera palabra puede estar capitalizada por defecto
    if (/^[A-ZÁÉÍÓÚÑÜ]/.test(t)) {
      const lower = normalize(t);
      if (!STOPWORDS_ES.has(lower)) return true;
    }
  }
  // Mayúscula en posición 0 + segunda palabra mayúscula también (ej. "Pedro Sánchez")
  if (tokens.length >= 2 && /^[A-ZÁÉÍÓÚÑÜ]/.test(tokens[0]) && /^[A-ZÁÉÍÓÚÑÜ]/.test(tokens[1] || '')) {
    return true;
  }
  return false;
}

function detectsActionVerb(headline: string): boolean {
  const tokens = normalize(headline).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
  return tokens.some(t => ACTION_VERBS.has(t));
}

export function auditHeadline(headline: string): AuditResult {
  const issues: AuditIssue[] = [];
  const positives: string[] = [];
  const trimmed = headline.trim();
  const length = trimmed.length;
  const lower = normalize(trimmed);

  // ─── ISSUES (penalizan score) ───────────────────────────────────────────

  // 1. Longitud
  if (length === 0) {
    return {
      headline: trimmed, score: 0, verdict: 'rewrite', length: 0,
      issues: [{ rule: 'empty', severity: 'high', message: 'Titular vacío.' }],
      positives: [],
    };
  }
  if (length > 90) {
    issues.push({ rule: 'too-long', severity: 'high', message: `Demasiado largo (${length} chars). Discover trunca a ~70-90.`, suggestion: 'Reducir a 60-80 chars.' });
  } else if (length > 70) {
    issues.push({ rule: 'long', severity: 'medium', message: `Largo (${length} chars). Riesgo truncado en mobile.`, suggestion: 'Comprimir a ≤70 chars.' });
  }
  if (length < 30) {
    issues.push({ rule: 'too-short', severity: 'medium', message: `Demasiado corto (${length} chars). Pierde contexto.`, suggestion: 'Añadir 1-2 palabras de detalle.' });
  }

  // 2. All-caps (3+ palabras consecutivas en mayúsculas)
  const allCapsMatch = trimmed.match(/\b([A-ZÁÉÍÓÚÑ]{3,}\s+){2,}[A-ZÁÉÍÓÚÑ]{3,}\b/);
  if (allCapsMatch) {
    issues.push({ rule: 'all-caps', severity: 'high', message: 'Bloque ALL-CAPS detectado. Discover penaliza fuertemente.', suggestion: 'Mantener mayúsculas solo en siglas y nombres propios.' });
  }

  // 3. Clickbait duro
  const cbHits = CLICKBAIT_HARD.filter(w => lower.includes(normalize(w)));
  if (cbHits.length > 0) {
    issues.push({ rule: 'clickbait', severity: 'high', message: `Palabras clickbait: ${cbHits.slice(0, 3).join(', ')}. Discover penaliza.`, suggestion: 'Sustituir por verbo factual + dato concreto.' });
  }

  // 4. Vague opener (esto/eso/lo que…)
  const firstWords = lower.split(/\s+/).slice(0, 3).join(' ');
  const vagueHit = VAGUE_OPENERS.find(w => firstWords.startsWith(normalize(w)));
  if (vagueHit) {
    issues.push({ rule: 'vague-opener', severity: 'medium', message: `Empieza con "${vagueHit}…" — apertura sin sujeto concreto.`, suggestion: 'Empezar con la entidad o sujeto principal.' });
  }

  // 5. Curiosity gap (puntos suspensivos sin contexto)
  if (/\.{3}\s*$/.test(trimmed) || /[…]\s*$/.test(trimmed)) {
    issues.push({ rule: 'curiosity-gap', severity: 'medium', message: 'Termina con "..." (curiosity gap). Discover lo penaliza.', suggestion: 'Cerrar con la información completa.' });
  }

  // 6. Demasiado interrogativo
  if (/^¿/.test(trimmed) && length > 50) {
    issues.push({ rule: 'long-question', severity: 'low', message: 'Pregunta larga. Mejor declarativo con la respuesta.' });
  }

  // 7. Falta de entidad
  if (!detectsEntity(trimmed)) {
    issues.push({ rule: 'no-entity', severity: 'high', message: 'No se detecta entidad nombrada (persona/lugar/org).', suggestion: 'Añadir nombre propio del sujeto principal.' });
  }

  // 8. Falta de verbo de acción
  if (!detectsActionVerb(trimmed)) {
    issues.push({ rule: 'no-verb', severity: 'medium', message: 'Sin verbo de acción claro.', suggestion: 'Añadir verbo en presente 3ª persona (anuncia, denuncia, gana, etc.).' });
  }

  // 9. Listicle con número grande
  const listicleMatch = trimmed.match(/^\s*(\d+)\s+(razones|cosas|trucos|claves|errores|secretos|tips|maneras|formas)/i);
  if (listicleMatch) {
    const n = parseInt(listicleMatch[1], 10);
    if (n > 15) {
      issues.push({ rule: 'long-listicle', severity: 'medium', message: `Listicle de ${n} ítems. Listicles >15 funcionan peor en ES/FR.`, suggestion: 'Reducir a ≤10.' });
    }
  }

  // 9.5. Muletilla IA en titular
  const aiHit = AI_TELLS_HEADLINE.find(w => lower.includes(normalize(w)));
  if (aiHit) {
    issues.push({
      rule: 'ai-tell',
      severity: 'high',
      message: `"${aiHit}" — muletilla IA. Suena artificial en titular.`,
      suggestion: 'Suprimir y empezar directamente con la entidad o el dato.',
    });
  }

  // 9.7. Raya media (em-dash) en titular — tic IA muy reconocible
  if ((trimmed.match(/—/g) || []).length >= 1) {
    issues.push({
      rule: 'em-dash',
      severity: 'medium',
      message: 'Raya media (—) en titular. Tic reconocible de IA.',
      suggestion: 'Sustituir por coma, punto o dos puntos.',
    });
  }

  // 10. Demasiados signos de exclamación
  const excl = (trimmed.match(/!/g) || []).length;
  if (excl >= 2) {
    issues.push({ rule: 'overexcite', severity: 'medium', message: `${excl} signos de exclamación. Riesgo de spammy.`, suggestion: 'Mantener 0-1 signo.' });
  }

  // ─── POSITIVES (refuerzan score) ────────────────────────────────────────

  if (length >= 50 && length <= 70) positives.push('Longitud óptima (50-70 chars)');
  if (detectsEntity(trimmed)) positives.push('Contiene entidad nombrada');
  if (detectsActionVerb(trimmed)) positives.push('Contiene verbo de acción');
  if (/\d/.test(trimmed)) positives.push('Contiene cifra concreta');
  if (/[":«»]/.test(trimmed)) positives.push('Cita/declaración entrecomillada');

  // ─── SCORE ──────────────────────────────────────────────────────────────

  let score = 100;
  for (const i of issues) {
    score -= i.severity === 'high' ? 25 : i.severity === 'medium' ? 12 : 5;
  }
  score += positives.length * 4;
  score = Math.max(0, Math.min(100, score));

  const verdict: AuditResult['verdict'] = score >= 75 ? 'good' : score >= 50 ? 'review' : 'rewrite';

  return { headline: trimmed, score, verdict, length, issues, positives };
}
