import type { VercelRequest, VercelResponse } from '@vercel/node';
import { auditHeadline } from '../src/analysis/headline-auditor.js';

/**
 * GET /api/audit-headline?h=<titular>
 * POST /api/audit-headline { headline: string }
 *
 * Devuelve auditoría del titular según reglas Discover ES/FR.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  let headline = '';
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
    headline = String(body.headline || '');
  } else {
    headline = String(req.query.h || req.query.headline || '');
  }
  if (!headline) {
    res.status(400).json({ error: 'falta titular: ?h=... o POST { headline }' });
    return;
  }
  const result = auditHeadline(headline);
  res.setHeader('Cache-Control', 'no-store');
  res.json(result);
}

function safeParse(s: string): any {
  try { return JSON.parse(s); } catch { return {}; }
}
