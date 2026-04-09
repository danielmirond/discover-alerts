import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchGoogleTrends } from '../src/sources/google-trends.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const trends = await fetchGoogleTrends();
    res.setHeader('Cache-Control', 's-maxage=300');
    res.json({ trends });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
