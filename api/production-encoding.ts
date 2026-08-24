import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadState, getState } from '../src/state/store.js';

/**
 * GET /api/production-encoding
 *
 * Marco Empty Shelves: mide encoding sobre TODA la producción reciente
 * (no solo lo que ya entró en Discover). Cruza:
 *   - state.mediaArticles (RSS + sitemap-news 24h) → todo lo que se publicó
 *   - state.contentAudits (encoding scores del content-audit-poll)
 *
 * Para cada publisher:
 *   - producedTotal: artículos con pubDate ≤24h
 *   - producedWithAudit: cuántos tienen audit hecho
 *   - encodedOk: audits con encoding score ≥60
 *   - encodedPct: encodedOk / producedWithAudit (calidad técnica real)
 *   - discoverHits: pages que entraron
 *   - recallOfEncoded: hits / encodedOk (KPI real Empty Shelves)
 *
 * Además: distribución global de encoding score sobre TODO lo producido.
 */

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    await loadState();
    const s = getState() as any;
    const nowMs = Date.now();
    const windowMs = 24 * 3600_000;

    // ── Producción 24h ─────────────────────────────────────────────────
    const articles = (s.mediaArticles || {}) as Record<string, any>;
    const producedByDomain = new Map<string, { urls: Set<string>; titles: string[] }>();
    for (const [, a] of Object.entries(articles)) {
      const pubMs = a.pubDate ? new Date(a.pubDate).getTime() : NaN;
      const firstMs = a.firstSeen ? new Date(a.firstSeen).getTime() : NaN;
      const refMs = !isNaN(pubMs) ? pubMs : firstMs;
      if (isNaN(refMs) || nowMs - refMs > windowMs) continue;
      const dom = extractDomain(a.link);
      if (!dom) continue;
      let e = producedByDomain.get(dom);
      if (!e) { e = { urls: new Set(), titles: [] }; producedByDomain.set(dom, e); }
      if (!e.urls.has(a.link)) {
        e.urls.add(a.link);
        e.titles.push(a.title || '');
      }
    }

    // ── Audits (con encoding) por URL ──────────────────────────────────
    const audits = (s.contentAudits || {}) as Record<string, any>;
    const auditByUrl = new Map<string, { score: number; issues: string[] }>();
    for (const [, a] of Object.entries(audits)) {
      if ((a as any).error || (a as any).encodingScore == null) continue;
      auditByUrl.set((a as any).url, {
        score: (a as any).encodingScore || 0,
        issues: (a as any).encodingIssues || [],
      });
    }

    // ── Discover hits por dominio (últimas 24h) ────────────────────────
    const pages = (s.pages || {}) as Record<string, any>;
    const discoverByDomain = new Map<string, number>();
    for (const [url, p] of Object.entries(pages)) {
      const first = (p as any).firstSeen || (p as any).lastUpdated;
      const t = first ? new Date(first).getTime() : NaN;
      if (isNaN(t) || nowMs - t > windowMs) continue;
      const dom = ((p as any).domain || extractDomain(url) || '').replace(/^www\./, '').toLowerCase();
      if (!dom) continue;
      discoverByDomain.set(dom, (discoverByDomain.get(dom) || 0) + 1);
    }

    // ── Combinar métricas por publisher ────────────────────────────────
    const rows: any[] = [];
    for (const [domain, prod] of producedByDomain) {
      const producedTotal = prod.urls.size;
      let producedWithAudit = 0;
      let encodedOk = 0;
      const scores: number[] = [];
      const commonIssues: Record<string, number> = {};
      for (const url of prod.urls) {
        const audit = auditByUrl.get(url);
        if (!audit) continue;
        producedWithAudit++;
        scores.push(audit.score);
        if (audit.score >= 60) encodedOk++;
        else {
          for (const iss of audit.issues) {
            const key = iss.split(':')[0].trim().slice(0, 60);
            commonIssues[key] = (commonIssues[key] || 0) + 1;
          }
        }
      }
      const discoverHits = discoverByDomain.get(domain) || 0;
      const encodedPct = producedWithAudit > 0 ? Math.round((encodedOk / producedWithAudit) * 1000) / 10 : 0;
      const recallOfEncoded = encodedOk > 0 ? Math.round((discoverHits / encodedOk) * 1000) / 10 : 0;
      const avgEncoding = scores.length > 0 ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : 0;
      const topIssues = Object.entries(commonIssues).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([issue, count]) => ({ issue, count }));
      rows.push({
        domain,
        producedTotal, producedWithAudit,
        encodedOk, encodedPct, avgEncoding,
        discoverHits, recallOfEncoded,
        topIssues,
      });
    }
    rows.sort((a, b) => b.producedTotal - a.producedTotal);

    // ── Distribución global encoding ────────────────────────────────────
    const allScores: number[] = [];
    for (const audit of auditByUrl.values()) {
      allScores.push(audit.score);
    }
    const dist = {
      excellent: allScores.filter(s => s >= 80).length,
      good: allScores.filter(s => s >= 60 && s < 80).length,
      weak: allScores.filter(s => s >= 40 && s < 60).length,
      broken: allScores.filter(s => s < 40).length,
    };
    const totalScoreMean = allScores.length > 0 ? Math.round(allScores.reduce((s, n) => s + n, 0) / allScores.length) : 0;

    res.setHeader('Cache-Control', 's-maxage=300');
    res.json({
      framework: 'Empty Shelves / Recall (arXiv 2602.14080) — encoding sobre producción total',
      windowHours: 24,
      computedAt: new Date().toISOString(),
      globalSummary: {
        totalProduced: rows.reduce((s, r) => s + r.producedTotal, 0),
        totalWithAudit: rows.reduce((s, r) => s + r.producedWithAudit, 0),
        totalEncoded: rows.reduce((s, r) => s + r.encodedOk, 0),
        totalDiscoverHits: rows.reduce((s, r) => s + r.discoverHits, 0),
        encodingScoreMean: totalScoreMean,
        distribution: dist,
        auditCoveragePct: rows.reduce((s, r) => s + r.producedTotal, 0) > 0
          ? Math.round((rows.reduce((s, r) => s + r.producedWithAudit, 0) / rows.reduce((s, r) => s + r.producedTotal, 0)) * 1000) / 10
          : 0,
      },
      rows: rows.filter(r => r.producedTotal >= 2 || r.discoverHits >= 1),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
