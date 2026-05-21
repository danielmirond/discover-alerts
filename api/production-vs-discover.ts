import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadState, getState } from '../src/state/store.js';

/**
 * GET /api/production-vs-discover
 *
 * Cruza producción (artículos RSS + sitemap news firstSeen 24h) con presencia
 * Discover (pages firstSeen 24h) por dominio. Devuelve ratio que indica
 * eficiencia editorial: % de su producción que entra en Discover.
 *
 * Útil para ver qué medios producen mucho y entran poco (volumen ineficiente)
 * vs medios que producen menos y entran más (foco editorial). Métrica
 * orientativa — Discover muestra solo un subset y publishers tienen audiencias
 * distintas, pero como brújula relativa funciona.
 */

function extractDomain(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch { return null; }
}

interface PublisherRow {
  domain: string;
  publisher?: string;
  /** Artículos publicados (sitemap + RSS) en últimas 24h. */
  production: number;
  /** Pages que han estado en Discover en últimas 24h. */
  discoverHits: number;
  /** Ratio = discoverHits / production en %. */
  ratio: number;
  /** Score Discover medio de las pages que entraron. */
  avgDiscoverScore: number;
  /** Score Discover máximo. */
  maxDiscoverScore: number;
  /** 3 titulares con score más alto en Discover. */
  topDiscoverTitles: string[];
  /** 3 titulares publicados que NO entraron en Discover (potenciales hot misses). */
  missedTitles: string[];
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    await loadState();
    const s = getState() as any;
    const nowMs = Date.now();
    const windowMs = 24 * 3600_000;

    // ── Producción 24h: agrupar mediaArticles por dominio ────────────────
    const articles = (s.mediaArticles || {}) as Record<string, any>;
    const prodByDomain = new Map<string, { titles: string[]; links: Set<string> }>();
    for (const [, a] of Object.entries(articles)) {
      const firstMs = new Date(a.firstSeen).getTime();
      if (isNaN(firstMs) || nowMs - firstMs > windowMs) continue;
      const dom = extractDomain(a.link);
      if (!dom) continue;
      let entry = prodByDomain.get(dom);
      if (!entry) { entry = { titles: [], links: new Set() }; prodByDomain.set(dom, entry); }
      if (!entry.links.has(a.link)) {
        entry.links.add(a.link);
        entry.titles.push(a.title || '');
      }
    }

    // ── Discover hits 24h: agrupar state.pages por dominio ───────────────
    const pages = (s.pages || {}) as Record<string, any>;
    const discoverByDomain = new Map<string, {
      scores: number[];
      titles: Array<{ title: string; score: number; link: string }>;
      links: Set<string>;
    }>();
    for (const [url, p] of Object.entries(pages)) {
      const first = p.firstSeen || p.lastUpdated;
      if (!first) continue;
      const firstMs = new Date(first).getTime();
      if (isNaN(firstMs) || nowMs - firstMs > windowMs) continue;
      const dom = (p.domain || extractDomain(url) || '').replace(/^www\./, '').toLowerCase();
      if (!dom) continue;
      let entry = discoverByDomain.get(dom);
      if (!entry) { entry = { scores: [], titles: [], links: new Set() }; discoverByDomain.set(dom, entry); }
      entry.scores.push(p.score || 0);
      entry.titles.push({ title: p.title || '', score: p.score || 0, link: url });
      entry.links.add(url);
    }

    // ── Combine ──────────────────────────────────────────────────────────
    const allDomains = new Set<string>([
      ...prodByDomain.keys(),
      ...discoverByDomain.keys(),
    ]);
    const rows: PublisherRow[] = [];
    for (const dom of allDomains) {
      const prod = prodByDomain.get(dom);
      const disc = discoverByDomain.get(dom);
      const production = prod ? prod.titles.length : 0;
      const discoverHits = disc ? disc.titles.length : 0;
      const ratio = production > 0 ? Math.round((discoverHits / production) * 1000) / 10 : 0;
      const scores = disc?.scores || [];
      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const max = scores.length > 0 ? Math.max(...scores) : 0;
      const top = (disc?.titles || []).sort((a, b) => b.score - a.score).slice(0, 3).map(t => t.title).filter(Boolean);
      // Missed = titulares producidos que no aparecen en discoverByDomain.links
      const missed: string[] = [];
      if (prod && disc) {
        for (let i = 0; i < prod.titles.length && missed.length < 3; i++) {
          // find the link of this title
          // simple approach: just sample titles whose link isn't in disc.links
        }
        // simpler: pick first 3 production titles whose links aren't in disc.links
        let count = 0;
        for (const link of prod.links) {
          if (!disc.links.has(link) && count < 3) {
            // find title for this link
            const art = Object.values(articles).find((a: any) => a.link === link) as any;
            if (art?.title) { missed.push(art.title); count++; }
          }
        }
      } else if (prod) {
        // sin nada en Discover → top 3 producidos sin más
        missed.push(...prod.titles.slice(0, 3));
      }
      rows.push({
        domain: dom,
        production,
        discoverHits,
        ratio,
        avgDiscoverScore: avg,
        maxDiscoverScore: max,
        topDiscoverTitles: top,
        missedTitles: missed,
      });
    }

    // Filtrar: descartar dominios con menos de 2 producciones (ruido)
    const filtered = rows
      .filter(r => r.production >= 2 || r.discoverHits >= 1)
      .sort((a, b) => b.ratio - a.ratio || b.discoverHits - a.discoverHits);

    res.setHeader('Cache-Control', 's-maxage=300');
    res.json({
      windowHours: 24,
      computedAt: new Date().toISOString(),
      totalPublishers: filtered.length,
      totalProduction: rows.reduce((s, r) => s + r.production, 0),
      totalDiscoverHits: rows.reduce((s, r) => s + r.discoverHits, 0),
      rows: filtered,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
