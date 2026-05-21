import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadState, getState } from '../src/state/store.js';

/**
 * GET /api/debug-state
 * Dump rápido del estado Redis para debugging. No exponer en prod largo plazo.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    await loadState();
    const state = getState();
    const media = (state as any).mediaArticles || {};
    const mediaByDomain: Record<string, { total: number; withPubDate: number; recentByPub: number; recentByFirst: number }> = {};
    const nowMs = Date.now();
    const W = 24 * 3600_000;
    for (const [, a] of Object.entries(media) as any[]) {
      let host = '';
      try { host = new URL(a.link).hostname.replace(/^www\./, ''); } catch {}
      if (!host) continue;
      if (!mediaByDomain[host]) mediaByDomain[host] = { total: 0, withPubDate: 0, recentByPub: 0, recentByFirst: 0 };
      const m = mediaByDomain[host];
      m.total++;
      if (a.pubDate) {
        m.withPubDate++;
        const t = new Date(a.pubDate).getTime();
        if (!isNaN(t) && nowMs - t <= W) m.recentByPub++;
      }
      if (a.firstSeen) {
        const t = new Date(a.firstSeen).getTime();
        if (!isNaN(t) && nowMs - t <= W) m.recentByFirst++;
      }
    }
    const mediaTopDomains = Object.entries(mediaByDomain)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 20)
      .map(([dom, m]) => ({ dom, ...m }));

    const ecm = state.entityCategoryMap || {};
    const etm = state.entityTopicMap || {};
    const pages = state.pages || {};
    const entities = state.entities || {};

    const ecmKeys = Object.keys(ecm);
    const etmKeys = Object.keys(etm);
    const entityKeys = Object.keys(entities);

    res.json({
      summary: {
        entityCategoryMap_size: ecmKeys.length,
        entityTopicMap_size: etmKeys.length,
        entities_size: entityKeys.length,
        pages_size: Object.keys(pages).length,
        media_size: Object.keys(media).length,
      },
      mediaTopDomains,
      entityCategoryMap_sample: ecmKeys.slice(0, 10).map(k => ({ entity: k, category: ecm[k] })),
      entityTopicMap_sample: etmKeys.slice(0, 10).map(k => ({ entity: k, topic: etm[k] })),
      entity_sample: entityKeys.slice(0, 5).map(k => ({ name: k, snap: entities[k] })),
      entity_appearances_distribution: (() => {
        const buckets: Record<string, number> = { '1': 0, '2-5': 0, '6-10': 0, '11+': 0 };
        for (const k of entityKeys) {
          const a = (entities[k] as any).appearances?.length || 0;
          if (a <= 1) buckets['1']++;
          else if (a <= 5) buckets['2-5']++;
          else if (a <= 10) buckets['6-10']++;
          else buckets['11+']++;
        }
        return buckets;
      })(),
      pages_sample: Object.entries(pages).slice(0, 3).map(([url, s]) => ({ url, ...s })),
      lastPollDiscover: state.lastPollDiscover,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
