import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadState, getState } from '../src/state/store.js';
import { detectSeasonalPredictions } from '../src/analysis/predictor.js';
import { weekKey } from '../src/analysis/weekly-aggregator.js';

/**
 * GET /api/predictions[?week=2026-W16][&tolerance=1]
 *
 * Predicciones estacionales basadas en weeklyHistory YoY. Devuelve:
 *  - entity/category/pattern que explotaron la misma semana (±N) en años
 *    anteriores y probablemente vuelvan.
 *
 * Si weeklyHistory está vacío o sin datos de años previos, devuelve lista
 * vacía con un aviso.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await loadState();
    const state = getState();
    const target = String(req.query.week || weekKey());
    const tolerance = parseInt(String(req.query.tolerance || '1'), 10);

    const history = state.weeklyHistory || {};
    const weeksLoaded = Object.keys(history).length;

    const predictions = detectSeasonalPredictions(state, {
      targetWeek: target,
      weekTolerance: tolerance,
    });

    const yearsInHistory = new Set(
      Object.keys(history)
        .map(k => /^(\d{4})-/.exec(k)?.[1])
        .filter(Boolean)
    );

    res.setHeader('Cache-Control', 's-maxage=600');
    res.json({
      targetWeek: target,
      tolerance,
      summary: {
        weeksInHistory: weeksLoaded,
        yearsInHistory: [...yearsInHistory].sort(),
        totalPredictions: predictions.length,
        byConfidence: {
          high: predictions.filter(p => p.confidence === 'high').length,
          medium: predictions.filter(p => p.confidence === 'medium').length,
          low: predictions.filter(p => p.confidence === 'low').length,
        },
      },
      predictions,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
