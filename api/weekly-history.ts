import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadState, getState } from '../src/state/store.js';

/**
 * Returns the full weekly history for a given week (or the most recent week
 * if none is specified). Response shape:
 *
 *   {
 *     week: "2026-W15",
 *     feeds: Record<feedName, WeeklyMediaStats>
 *   }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await loadState();
    const state = getState();
    const history = state.weeklyHistory || {};
    const availableWeeks = Object.keys(history).sort().reverse();

    const requestedWeek =
      typeof req.query.week === 'string' ? req.query.week : availableWeeks[0];

    if (!requestedWeek || !history[requestedWeek]) {
      res.json({
        week: requestedWeek || null,
        feeds: {},
        availableWeeks,
      });
      return;
    }

    res.setHeader('Cache-Control', 's-maxage=60');
    res.json({
      week: requestedWeek,
      feeds: history[requestedWeek],
      availableWeeks,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
