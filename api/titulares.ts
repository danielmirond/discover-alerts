import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadState } from '../src/state/store.js';
import { generarTitulares, nombreModelo, perfilInstancia } from '../src/analysis/titulares.js';

// El modelo local tarda 1-3 minutos: hace falta más que los 10 s por defecto.
export const config = { maxDuration: 300 };

/**
 * POST /api/titulares { titular, texto?, canales?: ['discover','search','portada','redes'], perfil? }
 *
 * Devuelve alternativas al titular con palanca, estructura, tiempo verbal,
 * longitud contra el rango medido, fuente literal y porqué, validadas.
 * Aprende de la competencia: usa los titulares que están entrando en Discover
 * en esta instancia (estado de la app) como ejemplos vivos.
 *
 * GET /api/titulares → configuración activa (modelo, perfil).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') {
    res.json({ modelo: nombreModelo(), perfil: perfilInstancia() });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST { titular, texto?, canales? }' });
    return;
  }
  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
  if (!body.titular) {
    res.status(400).json({ error: 'Falta titular' });
    return;
  }
  try {
    // El estado da los titulares de la competencia; si Redis no está, se sigue sin ellos.
    try { await loadState(); } catch (e: any) { console.warn('[titulares] sin estado:', e?.message); }
    const out = await generarTitulares({ titular: body.titular, texto: body.texto, canales: body.canales, perfil: body.perfil });
    res.json(out);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || String(err) });
  }
}

function safeParse(s: string): any {
  try { return JSON.parse(s); } catch { return {}; }
}
