import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadState, getState } from '../src/state/store.js';
import type { MediaFeed } from '../src/types.js';

/**
 * GET /api/ds-publishers
 *
 * Lista los publishers/dominios que DiscoverSnoop ha visto recientemente
 * (state.pages), agrupa por dominio, y marca cuáles ya están cubiertos
 * por un feed en feeds.json. Útil para detectar qué medios con tráfico
 * Discover real aún no tenemos trackeados.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    await loadState();
    const state = getState();
    const pages = state.pages || {};

    // Cargar feeds.json para saber qué dominios ya tenemos
    const feedsPath = process.env.FEEDS_PATH || path.join(process.cwd(), 'feeds.json');
    const feedsRaw = await readFile(feedsPath, 'utf-8');
    const feeds = (JSON.parse(feedsRaw) as { feeds: MediaFeed[] }).feeds;
    const trackedDomains = new Set(
      feeds.map(f => (f.domain || '').toLowerCase()).filter(Boolean)
    );

    type Row = {
      domain: string;
      pageCount: number;
      maxScore: number;
      tracked: boolean;
      sampleTitles: string[];
    };

    const byDomain = new Map<string, Row>();

    // state.pages está keyed por URL de la página
    for (const [url, snap] of Object.entries(pages)) {
      const rawDomain = extractDomain(url).toLowerCase();
      if (!rawDomain) continue;
      const domain = rawDomain.replace(/^www\./, '');

      let row = byDomain.get(domain);
      if (!row) {
        row = {
          domain,
          pageCount: 0,
          maxScore: 0,
          tracked: trackedDomains.has(domain) || trackedDomains.has(`www.${domain}`),
          sampleTitles: [],
        };
        byDomain.set(domain, row);
      }
      row.pageCount++;
      if ((snap.score || 0) > row.maxScore) row.maxScore = snap.score || 0;
      if (row.sampleTitles.length < 3 && snap.title) row.sampleTitles.push(snap.title);
    }

    const all = [...byDomain.values()].sort((a, b) => b.pageCount - a.pageCount);
    const notTracked = all.filter(r => !r.tracked);
    const tracked = all.filter(r => r.tracked);

    res.setHeader('Cache-Control', 's-maxage=300');
    res.json({
      summary: {
        totalPublishers: all.length,
        tracked: tracked.length,
        notTracked: notTracked.length,
      },
      notTracked,
      tracked,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

function extractDomain(url?: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}
