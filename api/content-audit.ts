import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadState, getState } from '../src/state/store.js';

/**
 * GET /api/content-audit
 *
 * Devuelve las auditorías estructurales de contenido /Sports almacenadas
 * por content-audit-poll (1×/día), agregadas:
 *   - summary: medias globales (wordCount, h2, images, videos)
 *   - distributions: histogramas para visualización
 *   - byPublisher: estadísticas agregadas por dominio
 *   - byCategory: por subcategoría DS (Soccer / Tennis / Motor / etc.)
 *   - top winners: las 20 pages con mayor score Discover snapshot
 *   - rows: tabla completa para drilldown
 *
 * Gated a INSTANCE_NAME=sport (404 en main).
 */

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? Math.round((s[mid - 1] + s[mid]) / 2) : s[mid];
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.round(arr.reduce((s, x) => s + x, 0) / arr.length);
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.floor(p * s.length));
  return s[idx];
}

interface Bucket { label: string; min: number; max: number; count: number; }

function histogram(values: number[], buckets: Array<[number, number, string]>): Bucket[] {
  const out: Bucket[] = buckets.map(([min, max, label]) => ({ label, min, max, count: 0 }));
  for (const v of values) {
    for (const b of out) {
      if (v >= b.min && v <= b.max) { b.count++; break; }
    }
  }
  return out;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if ((process.env.INSTANCE_NAME || 'main') !== 'sport') {
    res.status(404).json({ error: 'not found' });
    return;
  }
  try {
    await loadState();
    const s = getState() as any;
    const audits = (s.contentAudits || {}) as Record<string, any>;
    const all = Object.values(audits).filter((a: any) => !a.error && a.wordCount > 0) as any[];
    const lastPoll = s.lastPollContentAudit || null;

    if (all.length === 0) {
      res.json({
        lastPoll, totalAudits: 0,
        summary: null, distributions: null,
        byPublisher: [], byCategory: [], rows: [], topWinners: [],
        note: 'Aún no hay auditorías. Corre el cron content-audit-poll-sport o workflow_dispatch.',
      });
      return;
    }

    // Summary global
    const wc = all.map(a => a.wordCount);
    const h1 = all.map(a => a.h1);
    const h2 = all.map(a => a.h2);
    const h3 = all.map(a => a.h3);
    const imgs = all.map(a => a.images);
    const vids = all.map(a => a.videos);
    const paras = all.map(a => a.paragraphs);

    // Distribución de selector de body (article > itemprop > main > full).
    // Útil para saber qué % de pages tienen markup semántico vs cuántas
    // siguen contando con strip de chrome (más ruidoso).
    const bodySrc: Record<string, number> = { article: 0, itemprop: 0, main: 0, full: 0 };
    for (const a of all) {
      const src = a.bodySource || 'full';
      bodySrc[src] = (bodySrc[src] || 0) + 1;
    }

    const summary = {
      sample: all.length,
      bodySource: bodySrc,
      wordCount: { mean: mean(wc), median: median(wc), p25: percentile(wc, 0.25), p75: percentile(wc, 0.75), p90: percentile(wc, 0.9) },
      h1: { mean: mean(h1), median: median(h1) },
      h2: { mean: mean(h2), median: median(h2), p75: percentile(h2, 0.75) },
      h3: { mean: mean(h3), median: median(h3) },
      images: { mean: mean(imgs), median: median(imgs), p75: percentile(imgs, 0.75), p90: percentile(imgs, 0.9) },
      videos: { mean: mean(vids), median: median(vids), withVideo: vids.filter(v => v > 0).length, withVideoPct: Math.round((vids.filter(v => v > 0).length / vids.length) * 100) },
      paragraphs: { mean: mean(paras), median: median(paras) },
      amp: all.filter(a => a.amp).length,
      ampPct: Math.round((all.filter(a => a.amp).length / all.length) * 100),
    };

    // Distributions (histogramas)
    const distributions = {
      wordCount: histogram(wc, [
        [0, 199, '<200'], [200, 399, '200-399'], [400, 699, '400-699'],
        [700, 999, '700-999'], [1000, 1499, '1000-1499'], [1500, 2499, '1500-2499'],
        [2500, 99999, '≥2500'],
      ]),
      h2: histogram(h2, [
        [0, 0, '0'], [1, 2, '1-2'], [3, 5, '3-5'], [6, 9, '6-9'], [10, 99, '≥10'],
      ]),
      images: histogram(imgs, [
        [0, 0, '0'], [1, 1, '1'], [2, 3, '2-3'], [4, 7, '4-7'], [8, 14, '8-14'], [15, 999, '≥15'],
      ]),
      videos: histogram(vids, [
        [0, 0, '0'], [1, 1, '1'], [2, 3, '2-3'], [4, 999, '≥4'],
      ]),
    };

    // Por publisher
    const byPubMap = new Map<string, any[]>();
    for (const a of all) {
      const pub = a.publisher || '—';
      if (!byPubMap.has(pub)) byPubMap.set(pub, []);
      byPubMap.get(pub)!.push(a);
    }
    const byPublisher = [...byPubMap.entries()]
      .map(([publisher, items]) => ({
        publisher,
        count: items.length,
        wordCount: { mean: mean(items.map(a => a.wordCount)), median: median(items.map(a => a.wordCount)) },
        h2: { mean: mean(items.map(a => a.h2)) },
        images: { mean: mean(items.map(a => a.images)) },
        videos: { mean: mean(items.map(a => a.videos)), withVideoPct: Math.round((items.filter(a => a.videos > 0).length / items.length) * 100) },
        ampPct: Math.round((items.filter(a => a.amp).length / items.length) * 100),
        avgDiscoverScore: mean(items.map(a => a.scoreSnapshot || 0)),
      }))
      .filter(p => p.count >= 2)
      .sort((a, b) => b.count - a.count);

    // Por categoría
    const byCatMap = new Map<string, any[]>();
    for (const a of all) {
      const cat = a.category;
      let label: string;
      if (cat == null || cat === '') label = '— sin categoría';
      else if (typeof cat === 'number') label = `cat ${cat}`;
      else label = String(cat).replace(/^\//, '').split('/').slice(0, 3).join(' · ');
      if (!byCatMap.has(label)) byCatMap.set(label, []);
      byCatMap.get(label)!.push(a);
    }
    const byCategory = [...byCatMap.entries()]
      .map(([category, items]) => ({
        category,
        count: items.length,
        wordCount: { mean: mean(items.map(a => a.wordCount)), median: median(items.map(a => a.wordCount)) },
        h2: { mean: mean(items.map(a => a.h2)) },
        images: { mean: mean(items.map(a => a.images)) },
        videos: { mean: mean(items.map(a => a.videos)) },
      }))
      .filter(c => c.count >= 2)
      .sort((a, b) => b.count - a.count);

    // Top winners (score Discover más alto)
    const topWinners = [...all]
      .sort((a, b) => (b.scoreSnapshot || 0) - (a.scoreSnapshot || 0))
      .slice(0, 20)
      .map(a => ({
        url: a.url, title: a.title, publisher: a.publisher,
        scoreSnapshot: a.scoreSnapshot, category: a.category,
        wordCount: a.wordCount, h2: a.h2, h3: a.h3, images: a.images, videos: a.videos, amp: a.amp,
      }));

    // Rows (drilldown completo)
    const rows = all
      .map(a => ({
        url: a.url, title: a.title, publisher: a.publisher, category: a.category,
        scoreSnapshot: a.scoreSnapshot, positionSnapshot: a.positionSnapshot,
        wordCount: a.wordCount, h1: a.h1, h2: a.h2, h3: a.h3,
        images: a.images, videos: a.videos, paragraphs: a.paragraphs,
        lists: a.lists, amp: a.amp, bodySource: a.bodySource || 'full',
        auditedAt: a.auditedAt,
      }))
      .sort((a, b) => (b.scoreSnapshot || 0) - (a.scoreSnapshot || 0));

    res.setHeader('Cache-Control', 's-maxage=300');
    res.json({
      lastPoll,
      totalAudits: all.length,
      summary, distributions,
      byPublisher, byCategory,
      topWinners, rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
