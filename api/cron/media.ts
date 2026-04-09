import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runMediaPoll } from '../../src/polling/media-poll.js';
import { loadState } from '../../src/state/store.js';
import { logger } from '../../src/utils/logger.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await loadState();
    await runMediaPoll();
    res.json({ ok: true, timestamp: new Date().toISOString() });
  } catch (err: any) {
    logger.error('[cron/media] Error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}
