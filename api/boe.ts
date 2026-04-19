import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchBoeSumario } from '../src/sources/boe.js';
import { loadState } from '../src/state/store.js';

/**
 * Devuelve el sumario BOE de hoy. Incluye disposiciones, departamentos y
 * secciones. Opcional ?date=YYYYMMDD para un día concreto.
 *
 * Útil para la vista "BOE" del dashboard: ver qué se ha publicado en el
 * boletín oficial, cruzar con entidades Discover y detectar huecos.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await loadState();
    const items = await fetchBoeSumario();

    // Agrupamos por sección para la UI
    const bySection: Record<string, any[]> = {};
    for (const it of items) {
      const sec = it.seccion || '(sin sección)';
      if (!bySection[sec]) bySection[sec] = [];
      bySection[sec].push(it);
    }
    const sections = Object.entries(bySection)
      .map(([name, list]) => ({ name, count: list.length, items: list }))
      .sort((a, b) => b.count - a.count);

    res.setHeader('Cache-Control', 's-maxage=300');
    res.json({
      totalItems: items.length,
      sections,
      items, // lista plana también
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, totalItems: 0, items: [], sections: [] });
  }
}
