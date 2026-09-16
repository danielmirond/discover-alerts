import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

/**
 * Registro de lo que hace la redacción con las propuestas de Titulares.
 *
 * POST /api/titulares-log { tipo: 'eleccion' | 'copia' | 'edicion' | 'ninguna', original, propuesta?, editado?, tipo_propuesta?, angulo?, estructura?, veredicto? }
 * GET  /api/titulares-log?n=100  → últimos eventos (para analizar qué eligen y qué cambian)
 *
 * Es la señal de aprendizaje: con unos cientos de eventos se ve qué ángulos
 * prefieren, qué acortan, qué quitan, y se convierte en regla con fecha.
 */
const CLAVE = 'da:titulares:log';
const MAX = 5000;

function redis(): Redis | null {
  const url = process.env.TITULARES_REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.TITULARES_REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const r = redis();
  if (!r) { res.status(503).json({ error: 'Sin Redis' }); return; }
  if (req.method === 'GET') {
    const n = Math.min(500, Number(req.query.n || 100));
    const items = await r.lrange<any>(CLAVE, 0, n - 1);
    res.json({ instancia: process.env.INSTANCE_NAME || 'main', eventos: items });
    return;
  }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST' }); return; }
  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
  if (!body.tipo || !body.original) { res.status(400).json({ error: 'Falta tipo u original' }); return; }
  const evento = {
    ts: new Date().toISOString(),
    instancia: process.env.INSTANCE_NAME || 'main',
    tipo: String(body.tipo).slice(0, 20),
    original: String(body.original).slice(0, 300),
    propuesta: body.propuesta ? String(body.propuesta).slice(0, 300) : undefined,
    editado: body.editado ? String(body.editado).slice(0, 300) : undefined,
    tipo_propuesta: body.tipo_propuesta, angulo: body.angulo, estructura: body.estructura, veredicto: body.veredicto,
  };
  await r.lpush(CLAVE, evento);
  await r.ltrim(CLAVE, 0, MAX - 1);
  res.json({ ok: true });
}

function safeParse(s: string): any { try { return JSON.parse(s); } catch { return {}; } }
