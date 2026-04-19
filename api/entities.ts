import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadState } from '../src/state/store.js';

/**
 * Devuelve todas las entidades actualmente tracked en estado, con su
 * categoría DS, topic derivado, snapshot básico y sus matching articles
 * recientes (top 3). Usado por la pestaña Config → Entidades.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await loadState();
    const { getState } = await import('../src/state/store.js');
    const state = getState();

    // Parse pagination
    const limit = Math.min(parseInt((req.query.limit as string) || '500', 10), 2000);
    const offset = Math.max(parseInt((req.query.offset as string) || '0', 10), 0);
    const topicFilter = ((req.query.topic as string) || '').toLowerCase();
    const q = ((req.query.q as string) || '').toLowerCase();

    const entityNames = Object.keys(state.entities || {});
    const entries = entityNames.map(name => {
      const snap = state.entities[name];
      return {
        name,
        score: snap.score,
        position: snap.position,
        publications: snap.publications,
        firstSeen: snap.firstSeen,
        lastUpdated: snap.lastUpdated,
        appearancesCount: (snap.appearances || []).length,
        category: state.entityCategoryMap?.[name] || null,
        topic: state.entityTopicMap?.[name] || null,
      };
    });

    // Filters
    let filtered = entries;
    if (topicFilter) filtered = filtered.filter(e => (e.topic || '').toLowerCase() === topicFilter);
    if (q) filtered = filtered.filter(e => e.name.toLowerCase().includes(q));

    // Sort by score desc
    filtered.sort((a, b) => b.score - a.score);

    res.setHeader('Cache-Control', 's-maxage=30');
    res.json({
      total: filtered.length,
      totalAllEntities: entityNames.length,
      offset,
      limit,
      entities: filtered.slice(offset, offset + limit),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
