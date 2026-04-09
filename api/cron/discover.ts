import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runDiscoverPoll } from '../../src/polling/discover-poll.js';
import { loadState } from '../../src/state/store.js';
import { logger } from '../../src/utils/logger.js';

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
    logger.error('[cron/discover] Error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}
