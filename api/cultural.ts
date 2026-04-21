import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadState, getState } from '../src/state/store.js';

/**
 * GET /api/cultural
 * Devuelve Netflix Top 10 ES (semanal) y FlixPatrol ES (diario).
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    await loadState();
    const s = getState() as any;
    // Enriquecer con inDiscover vía live-view (reuso para no duplicar lógica)
    const { buildLiveView } = await import('../src/analysis/live-view.js');
    const lv = await buildLiveView();
    const cultural = (lv as any).cultural || [];
    const culturalEntityHits = (lv as any).culturalEntityHits || [];

    res.setHeader('Cache-Control', 's-maxage=300');
    res.json({
      lastPoll: s.lastPollCultural || null,
      netflixTop: s.netflixTop || [],
      flixpatrolTop: s.flixpatrolTop || [],
      applePodcastsTop: s.applePodcastsTop || [],
      steamTop: s.steamTop || [],
      cultural,
      culturalEntityHits,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
