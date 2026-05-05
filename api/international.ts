import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadState, getState } from '../src/state/store.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    await loadState();
    const s = getState() as any;
    res.setHeader('Cache-Control', 's-maxage=300');
    res.json({
      lastPoll: s.lastPollInternational || null,
      countries: s.internationalSport || {},
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
