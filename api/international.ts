import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadState, getState } from '../src/state/store.js';
import { analyzeCountry } from '../src/analysis/international-patterns.js';
import type { InternationalTrackedPage } from '../src/polling/international-poll.js';

/** Normaliza la categoría DS a label legible.
 *  "/Sports/Soccer" → "Sports · Soccer"
 *  "/News/Sports"   → "News · Sports"
 *  "/Sports"        → "Sports"
 */
function categoryLabel(cat?: string): string {
  if (!cat) return '— sin categoría';
  return cat.replace(/^\//, '').split('/').join(' · ');
}

/** Audience score = maxScore × √pollsSeen.
 *  Premia score alto pero el tiempo en feed aumenta sublinealmente para no
 *  dejar fuera noticias frescas con score muy alto.
 *  Ejemplos: score 80 + 1 poll → 80. Score 50 + 9 polls (≈4.5h) → 150. */
function audienceScore(p: InternationalTrackedPage): number {
  return Math.round(p.maxScore * Math.sqrt(Math.max(1, p.pollsSeen)));
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    await loadState();
    const s = getState() as any;
    const countries = s.internationalSport || {};
    const tracking: Record<string, InternationalTrackedPage> = s.internationalTracking || {};

    // Análisis editorial por país (publishers / trigramas / fórmulas)
    const enriched: Record<string, any> = {};
    for (const [code, snap] of Object.entries(countries) as [string, any][]) {
      const analysis = analyzeCountry(snap);
      enriched[code] = { ...snap, ...analysis };
    }

    // ── Ranking Audience global agrupado por categoría/subcategoría ───────
    // Para cada categoría: top N pages mundiales ordenadas por audienceScore.
    const byCategory = new Map<string, Array<InternationalTrackedPage & { audienceScore: number; hoursInFeed: number }>>();
    for (const p of Object.values(tracking)) {
      const hours = (new Date(p.lastSeen).getTime() - new Date(p.firstSeen).getTime()) / 3600_000;
      const enrichedP = { ...p, audienceScore: audienceScore(p), hoursInFeed: Math.round(hours * 10) / 10 };
      const label = categoryLabel(p.category);
      let arr = byCategory.get(label);
      if (!arr) { arr = []; byCategory.set(label, arr); }
      arr.push(enrichedP);
    }
    const audienceRanking = [...byCategory.entries()]
      .map(([category, items]) => ({
        category,
        count: items.length,
        top: items.sort((a, b) => b.audienceScore - a.audienceScore).slice(0, 10),
      }))
      .sort((a, b) => b.count - a.count);

    res.setHeader('Cache-Control', 's-maxage=300');
    res.json({
      lastPoll: s.lastPollInternational || null,
      countries: enriched,
      audienceRanking,
      audienceStats: {
        totalTracked: Object.keys(tracking).length,
        activeNow: Object.values(tracking).filter(p => p.active).length,
        categories: byCategory.size,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
