import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runDiscoverPoll } from '../../src/polling/discover-poll.js';
import { loadState } from '../../src/state/store.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret to prevent unauthorized access
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await loadState();
    await runDiscoverPoll();
    res.json({ ok: true, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error('[cron/discover] Error:', err);
    res.status(500).json({ error: err.message });
  }
}
