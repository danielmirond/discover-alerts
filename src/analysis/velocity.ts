/**
 * Velocity / momentum detector para entidades.
 *
 * Computa la tasa de apariciones en 3 ventanas (1h, 3h, 12h) y una
 * "aceleración" = v1h / v3h. Esto permite predecir si una entidad sigue
 * subiendo (rising), si ha hecho pico (peaking), si está enfriándose
 * (fading), o si lleva estable un rato (steady).
 *
 * Todos los cálculos son deterministas y sin dependencias externas.
 */

export type Momentum = 'rising' | 'peaking' | 'fading' | 'steady' | 'new';

export interface VelocityMetrics {
  /** Apariciones en la última hora */
  v1h: number;
  /** Apariciones/hora en las últimas 3h (rate normalizado) */
  v3hRate: number;
  /** Apariciones/hora en las últimas 12h (rate normalizado) */
  v12hRate: number;
  /** v1h / v3hRate: >1.5 acelerando, <0.5 decelerando, ~1 estable */
  acceleration: number;
  momentum: Momentum;
}

function countInWindow(timestamps: string[], nowMs: number, windowMs: number): number {
  return timestamps.filter(ts => nowMs - new Date(ts).getTime() <= windowMs).length;
}

const HOUR = 3600_000;

/**
 * Clasifica el momentum a partir de las tres tasas.
 *
 * Reglas (en orden de evaluación):
 *   - Si solo hay v1h y no hay historial previo (v3hRate < 0.4 y v12hRate < 0.1) → "new"
 *   - Si acceleration >= 1.5 y v12hRate >= 0.8 (sostenido muchas horas) → "peaking"
 *   - Si acceleration >= 1.5 → "rising"
 *   - Si acceleration <= 0.5 y v12hRate > 0 → "fading"
 *   - Resto → "steady"
 */
function classifyMomentum(v1h: number, v3hRate: number, v12hRate: number, acceleration: number): Momentum {
  if (v1h >= 2 && v3hRate < 0.4 && v12hRate < 0.1) return 'new';
  if (acceleration >= 1.5 && v12hRate >= 0.8) return 'peaking';
  if (acceleration >= 1.5) return 'rising';
  if (acceleration <= 0.5 && v12hRate > 0) return 'fading';
  return 'steady';
}

export function computeVelocity(appearances: string[], nowMs: number = Date.now()): VelocityMetrics {
  const c1 = countInWindow(appearances, nowMs, 1 * HOUR);
  const c3 = countInWindow(appearances, nowMs, 3 * HOUR);
  const c12 = countInWindow(appearances, nowMs, 12 * HOUR);

  const v1h = c1;
  const v3hRate = c3 / 3;
  const v12hRate = c12 / 12;

  // Guard against tiny denominators; 0.01 apariciones/hora = prácticamente cero.
  const acceleration = v1h / Math.max(v3hRate, 0.01);
  const momentum = classifyMomentum(v1h, v3hRate, v12hRate, acceleration);

  return { v1h, v3hRate, v12hRate, acceleration, momentum };
}

/** Icono ASCII/emoji por momentum para UI/Slack. */
export function momentumIcon(m: Momentum): string {
  switch (m) {
    case 'rising':  return ':rocket:';
    case 'peaking': return ':fire:';
    case 'fading':  return ':chart_with_downwards_trend:';
    case 'new':     return ':sparkles:';
    case 'steady':  return ':heavy_minus_sign:';
  }
}

export function momentumLabel(m: Momentum): string {
  switch (m) {
    case 'rising':  return 'Rising (acelerando)';
    case 'peaking': return 'Peaking (pico sostenido)';
    case 'fading':  return 'Fading (bajando)';
    case 'new':     return 'New burst';
    case 'steady':  return 'Steady';
  }
}
