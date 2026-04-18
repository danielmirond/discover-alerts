import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadState } from '../src/state/store.js';
import { buildLiveView } from '../src/analysis/live-view.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    await loadState();
    const view = await buildLiveView();
    res.setHeader('Cache-Control', 's-maxage=30');
    res.json(view);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
