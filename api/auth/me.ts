import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionEmailFromReq } from '../../src/auth/jwt.js';

/**
 * GET /api/auth/me → { email } | 401
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const email = await getSessionEmailFromReq(req);
  if (!email) {
    res.status(401).json({ error: 'No session' });
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  res.json({ email });
}
