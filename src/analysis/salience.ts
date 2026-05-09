/**
 * Salience score por entidad en una página.
 *
 * Concepto del research 1492.vision (Knowledge Graph):
 *   No todas las entidades de un artículo cuentan igual. La entidad PRINCIPAL
 *   del artículo (sujeto) es la que Discover usa para clasificar y rankear.
 *   Una entidad mencionada de pasada en el cuerpo no aporta lo mismo que la
 *   entidad central del titular.
 *
 * Aproximación local sin NLP avanzado:
 *   - Posición en titular (early > late, primer tercio = +0.5)
 *   - Presencia (titular vs description vs solo body)
 *   - Frecuencia normalizada (apariciones / total tokens)
 *   - Bonus por longitud (entidades de 2+ tokens son más específicas)
 *   - Bonus si está en title_original también
 *
 * Score normalizado [0, 1]. La entidad con mayor salience por página es
 * el "primaryEntity" — todas las demás son secondaryEntities.
 */

export interface SalienceResult {
  entity: string;
  salience: number; // 0..1
  inTitle: boolean;
  inDescription: boolean;
  positionInTitle: number; // 0..1 (0 = primera palabra, 1 = última)
  occurrences: number;
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Posición relativa de la PRIMERA aparición de needle en haystack. */
function firstPositionRatio(haystack: string, needle: string): number | null {
  const idx = normalize(haystack).indexOf(normalize(needle));
  if (idx < 0) return null;
  return haystack.length > 0 ? idx / haystack.length : 0;
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  const h = normalize(haystack);
  const n = normalize(needle);
  if (n.length < 2) return 0;
  let count = 0;
  let i = 0;
  while ((i = h.indexOf(n, i)) !== -1) {
    count++;
    i += n.length;
  }
  return count;
}

export function computeSalience(
  entity: string,
  page: { title?: string; title_original?: string; snippet?: string; description?: string },
): SalienceResult {
  const title = page.title || '';
  const titleOrig = page.title_original || title;
  const desc = page.description || page.snippet || '';

  const occInTitle = countOccurrences(title, entity);
  const occInDesc = countOccurrences(desc, entity);
  const inTitle = occInTitle > 0;
  const inDescription = occInDesc > 0;

  const posRatio = inTitle ? (firstPositionRatio(title, entity) ?? 1) : 1;

  // Score base
  let score = 0;
  // Estar en titular vale mucho
  if (inTitle) {
    score += 0.50;
    // Posición early bonus (primer tercio)
    if (posRatio <= 0.33) score += 0.20;
    else if (posRatio <= 0.50) score += 0.10;
    // Múltiples ocurrencias en titular = entidad muy central
    if (occInTitle >= 2) score += 0.05;
  }
  // Estar en description suma menos
  if (inDescription) {
    score += 0.15;
    if (occInDesc >= 2) score += 0.05;
  }
  // Bonus por entidad de varias palabras (más específica)
  const tokens = entity.trim().split(/\s+/).length;
  if (tokens >= 2) score += 0.05;
  if (tokens >= 3) score += 0.05;
  // Bonus si aparece también en title_original (no solo título traducido)
  if (titleOrig !== title && countOccurrences(titleOrig, entity) > 0) score += 0.05;

  return {
    entity,
    salience: Math.min(1, Math.max(0, score)),
    inTitle,
    inDescription,
    positionInTitle: inTitle ? posRatio : 1,
    occurrences: occInTitle + occInDesc,
  };
}

/**
 * Para una página con N entidades, devuelve la lista ordenada por salience
 * desc, marcando primary (la #1) y secondary (resto).
 */
export function rankEntitiesBySalience(
  entities: string[],
  page: { title?: string; title_original?: string; snippet?: string; description?: string },
): { primary: SalienceResult | null; secondary: SalienceResult[] } {
  if (!entities || entities.length === 0) return { primary: null, secondary: [] };
  const ranked = entities
    .map(e => computeSalience(e, page))
    .filter(r => r.salience > 0)
    .sort((a, b) => b.salience - a.salience);
  if (ranked.length === 0) return { primary: null, secondary: [] };
  return { primary: ranked[0], secondary: ranked.slice(1) };
}
