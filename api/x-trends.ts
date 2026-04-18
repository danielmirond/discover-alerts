import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchXTrends } from '../src/sources/x-trends.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const trends = await fetchXTrends();
    res.setHeader('Cache-Control', 's-maxage=600');
    res.json({ trends });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
