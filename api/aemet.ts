import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadState, getState } from '../src/state/store.js';

/**
 * GET /api/aemet
 * Devuelve avisos meteorológicos AEMET scrapeados del HTML público.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    await loadState();
    const s = getState() as any;
    const avisos = (s.aemetAvisos || []) as Array<{ level: string; region: string; phenomenon: string; raw: string }>;
    const byLevel = { rojo: [] as any[], naranja: [] as any[], amarillo: [] as any[], desconocido: [] as any[] };
    for (const a of avisos) {
      const k = (a.level || 'desconocido') as keyof typeof byLevel;
      (byLevel[k] || byLevel.desconocido).push(a);
    }
    res.setHeader('Cache-Control', 's-maxage=300');
    res.json({
      lastPoll: s.lastPollAemet || null,
      total: avisos.length,
      byLevel: {
        rojo: byLevel.rojo.length,
        naranja: byLevel.naranja.length,
        amarillo: byLevel.amarillo.length,
      },
      avisos,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
