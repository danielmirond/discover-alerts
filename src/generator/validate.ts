// Validacion del output del LLM. Si no pasa, intentamos regenerar
// con feedback explicito. Tres rondas maximo antes de fallar.

export const VALID_PAIN_CATEGORIES = [
  'nomina', 'precios', 'tiempo-libre', 'vivienda', 'horarios',
  'prohibiciones', 'obligaciones', 'molestias', 'ayudas',
  'oposiciones', 'pensiones', 'movilidad', 'sanidad', 'otros',
] as const;

export interface GeneratedArticle {
  title: string;
  description: string;
  painCategory: string;
  painHook: string;
  tags: string[];
  body: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateArticle(a: GeneratedArticle): ValidationResult {
  const errors: string[] = [];

  if (!a.title || typeof a.title !== 'string') {
    errors.push('title es obligatorio y debe ser string');
  } else {
    const len = a.title.length;
    if (len < 30) errors.push(`title demasiado corto (${len} chars, minimo 30)`);
    if (len > 95) errors.push(`title demasiado largo (${len} chars, maximo 95)`);
    if (a.title.endsWith('?')) errors.push('title no debe ser una pregunta');
  }

  if (!a.description || typeof a.description !== 'string') {
    errors.push('description obligatoria');
  } else {
    const len = a.description.length;
    if (len < 100) errors.push(`description demasiado corta (${len} chars, minimo 100)`);
    if (len > 200) errors.push(`description demasiado larga (${len} chars, maximo 200)`);
  }

  if (!VALID_PAIN_CATEGORIES.includes(a.painCategory as typeof VALID_PAIN_CATEGORIES[number])) {
    errors.push(
      `painCategory "${a.painCategory}" no valido, debe ser uno de: ${VALID_PAIN_CATEGORIES.join(', ')}`,
    );
  }

  if (!a.painHook || a.painHook.length < 20 || a.painHook.length > 140) {
    errors.push('painHook debe ser una frase de 20-140 chars');
  }

  if (!Array.isArray(a.tags) || a.tags.length < 1 || a.tags.length > 8) {
    errors.push('tags debe ser un array de 1-8 elementos');
  }

  if (!a.body || typeof a.body !== 'string') {
    errors.push('body es obligatorio');
  } else {
    const wordCount = a.body.trim().split(/\s+/).length;
    if (wordCount < 250) errors.push(`body demasiado corto (${wordCount} palabras, minimo 250)`);
    if (wordCount > 900) errors.push(`body demasiado largo (${wordCount} palabras, maximo 900)`);
    // Debe tener al menos un subtitulo
    if (!/^#{2,3}\s+/m.test(a.body)) {
      errors.push('body debe tener al menos un subtitulo H2 (## ...)');
    }
  }

  return { ok: errors.length === 0, errors };
}

export function parseJsonLoose(raw: string): GeneratedArticle {
  let cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  // A veces el modelo envuelve en <response>...</response>
  cleaned = cleaned.replace(/^<response>/i, '').replace(/<\/response>$/i, '');
  return JSON.parse(cleaned) as GeneratedArticle;
}
