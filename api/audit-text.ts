import type { VercelRequest, VercelResponse } from '@vercel/node';
import { auditText } from '../src/analysis/text-auditor.js';

/**
 * GET  /api/audit-text?t=<texto>
 * POST /api/audit-text { text: string }
 *
 * Auditoría anti-IA del cuerpo de un texto: muletillas, rayas medias
 * abusivas, adjetivos abstractos, cierres plásticos, paralelismo
 * estructural, frases uniformes. Pensado como filtro local previo al
 * paso por ChatGPT.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Feature gated a la instancia 'sport' — curso de redacción IA Estadio
  // Deportivo. En main devolvemos 404 para no exponer el endpoint.
  if ((process.env.INSTANCE_NAME || 'main') !== 'sport') {
    res.status(404).json({ error: 'not found' });
    return;
  }
  let text = '';
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
    text = String(body.text || '');
  } else {
    text = String(req.query.t || req.query.text || '');
  }
  if (!text) {
    res.status(400).json({ error: 'falta texto: ?t=... o POST { text }' });
    return;
  }
  const result = auditText(text);
  res.setHeader('Cache-Control', 'no-store');
  res.json(result);
}

function safeParse(s: string): any {
  try { return JSON.parse(s); } catch { return {}; }
}
