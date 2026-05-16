import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadState, getState } from '../src/state/store.js';
import { analyzeCountry } from '../src/analysis/international-patterns.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    await loadState();
    const s = getState() as any;
    const countries = s.internationalSport || {};

    // Adjuntar análisis editorial (publishers/trigramas/fórmulas) por país.
    // Cómputo en demanda: ~30 pages × 13 países, cache 5 min.
    const enriched: Record<string, any> = {};
    for (const [code, snap] of Object.entries(countries) as [string, any][]) {
      const analysis = analyzeCountry(snap);
      enriched[code] = { ...snap, ...analysis };
    }

    res.setHeader('Cache-Control', 's-maxage=300');
    res.json({
      lastPoll: s.lastPollInternational || null,
      countries: enriched,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
