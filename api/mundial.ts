import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadState, getState } from '../src/state/store.js';

/**
 * GET /api/mundial
 *
 * Vista cross-source de cobertura "Mundial" (Copa del Mundo / selecciones
 * nacionales). Filtra por keywords sobre titular + URL en:
 *  - state.mediaArticles (RSS + sitemap-news, ventana 24h)
 *  - state.pages (Discover snapshot vigente)
 *  - state.entities (entidades DS detectadas)
 *  - state.internationalSport (pages mundiales por país /Sports)
 *
 * No requiere fetch externo: reusa datos ya cacheados por los polls.
 * Gated a la instancia 'sport' (en main devuelve 404).
 */

// Keywords ES/EN/IT/FR/PT/DE relacionadas con Mundial 2026 + selecciones
// nacionales relevantes. Lo dejamos curado en código para fácil iteración —
// si el redactor pide otro término, lo añadimos aquí.
const MUNDIAL_KEYWORDS = [
  // Genéricos multi-idioma
  'mundial', 'world cup', 'copa del mundo', 'copa mundial', 'mondiale',
  'coupe du monde', 'copa do mundo', 'wm', 'weltmeisterschaft',
  'fifa', 'mundial 2026', 'mundial de futbol', 'mundial-2026',
  // Selecciones — España y rivales clásicos
  'selección', 'seleccion', 'la roja', 'spain national', 'azzurri',
  'squadra azzurra', 'équipe de france', 'bleus', 'mannschaft',
  // Selecciones americanas
  'albiceleste', 'canarinha', 'seleção', 'tri mexicano', 'tri',
  'usmnt', 'la verde', 'la blanquirroja', 'la sele', 'la roja chilena',
  // Otras de alta relevancia
  'three lions', 'england national', 'oranje', 'samurai blue',
];

function normalize(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const NORM_KEYWORDS = MUNDIAL_KEYWORDS.map(normalize);

function matchKeyword(haystack: string): string | null {
  const h = normalize(haystack);
  if (!h) return null;
  for (const k of NORM_KEYWORDS) {
    // Búsqueda con boundary suave: matchea palabras completas o prefijos.
    // Para 'wm' exigimos word-boundary estricto para no enganchar 'gymnastics'.
    if (k.length <= 3) {
      const re = new RegExp(`\\b${k}\\b`);
      if (re.test(h)) return k;
    } else if (h.includes(k)) {
      return k;
    }
  }
  return null;
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if ((process.env.INSTANCE_NAME || 'main') !== 'sport') {
    res.status(404).json({ error: 'not found' });
    return;
  }
  try {
    await loadState();
    const s = getState() as any;
    const nowMs = Date.now();
    const windowMs = 24 * 3600_000;

    // ── 1) Artículos RSS/sitemap con match ───────────────────────────────
    const articles = (s.mediaArticles || {}) as Record<string, any>;
    const matchedArticles: Array<{
      title: string; link: string; domain: string; feedName?: string;
      pubDate?: string; firstSeen: string; keyword: string;
    }> = [];
    for (const [, a] of Object.entries(articles)) {
      const pubMs = a.pubDate ? new Date(a.pubDate).getTime() : NaN;
      const firstMs = a.firstSeen ? new Date(a.firstSeen).getTime() : NaN;
      const refMs = !isNaN(pubMs) ? pubMs : firstMs;
      if (isNaN(refMs) || nowMs - refMs > windowMs) continue;
      const kwTitle = matchKeyword(a.title || '');
      const kwUrl = matchKeyword(a.link || '');
      const kw = kwTitle || kwUrl;
      if (!kw) continue;
      matchedArticles.push({
        title: a.title || '',
        link: a.link,
        domain: extractDomain(a.link),
        feedName: a.feedName,
        pubDate: a.pubDate,
        firstSeen: a.firstSeen,
        keyword: kw,
      });
    }
    matchedArticles.sort((x, y) => {
      const tx = new Date(x.pubDate || x.firstSeen).getTime();
      const ty = new Date(y.pubDate || y.firstSeen).getTime();
      return ty - tx;
    });

    // ── 2) Pages Discover ES con match (vigentes en /Sports) ─────────────
    const pages = (s.pages || {}) as Record<string, any>;
    const matchedPages: Array<{
      url: string; title: string; image?: string; domain?: string;
      score: number; position?: number; firstSeen?: string; keyword: string;
    }> = [];
    for (const [url, p] of Object.entries(pages)) {
      const kw = matchKeyword(p.title || '') || matchKeyword(url);
      if (!kw) continue;
      matchedPages.push({
        url, title: p.title || '', image: p.image,
        domain: p.domain, score: p.score || 0,
        position: p.position, firstSeen: p.firstSeen,
        keyword: kw,
      });
    }
    matchedPages.sort((a, b) => b.score - a.score);

    // ── 3) Entidades DS con match ────────────────────────────────────────
    const entities = (s.entities || {}) as Record<string, any>;
    const matchedEntities: Array<{
      name: string; score: number; position: number; publications: number; keyword: string;
    }> = [];
    for (const [name, e] of Object.entries(entities)) {
      const kw = matchKeyword(name);
      if (!kw) continue;
      matchedEntities.push({
        name,
        score: e.score || 0,
        position: e.position || 0,
        publications: e.publications || 0,
        keyword: kw,
      });
    }
    matchedEntities.sort((a, b) => b.score - a.score);

    // ── 4) Cross-país: international tracking con match ──────────────────
    const intl = (s.internationalSport || {}) as Record<string, any>;
    type IntlHit = {
      country: string; title: string; url: string; image?: string;
      domain?: string; score: number; keyword: string;
    };
    const intlHits: IntlHit[] = [];
    for (const [code, snap] of Object.entries(intl)) {
      const pages = snap?.pages || [];
      for (const p of pages) {
        const kw = matchKeyword(p.title || '') || matchKeyword(p.url || '');
        if (!kw) continue;
        intlHits.push({
          country: code,
          title: p.title || '',
          url: p.url || '',
          image: p.image,
          domain: p.domain || p.publisher,
          score: p.score || 0,
          keyword: kw,
        });
      }
    }
    intlHits.sort((a, b) => b.score - a.score);

    // ── Resumen por publisher (artículos matched) ─────────────────────────
    const byPublisher = new Map<string, number>();
    for (const a of matchedArticles) {
      if (!a.domain) continue;
      byPublisher.set(a.domain, (byPublisher.get(a.domain) || 0) + 1);
    }
    const publisherSummary = [...byPublisher.entries()]
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // ── Distribución keywords (qué término dispara más cobertura) ───────
    const kwCount = new Map<string, number>();
    for (const arr of [matchedArticles, matchedPages, matchedEntities, intlHits]) {
      for (const it of arr as any[]) {
        kwCount.set(it.keyword, (kwCount.get(it.keyword) || 0) + 1);
      }
    }
    const keywordsTop = [...kwCount.entries()]
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    res.setHeader('Cache-Control', 's-maxage=300');
    res.json({
      windowHours: 24,
      computedAt: new Date().toISOString(),
      summary: {
        articles: matchedArticles.length,
        pages: matchedPages.length,
        entities: matchedEntities.length,
        internationalPages: intlHits.length,
        publishers: publisherSummary.length,
      },
      keywordsTop,
      publisherSummary,
      matchedPages: matchedPages.slice(0, 30),
      matchedEntities: matchedEntities.slice(0, 30),
      matchedArticles: matchedArticles.slice(0, 80),
      internationalHits: intlHits.slice(0, 40),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
