import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildClearCookie } from '../../src/auth/jwt.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Set-Cookie', buildClearCookie());
  res.setHeader('Location', '/login.html');
  res.status(302).end();
}
