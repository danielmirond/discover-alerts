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

// HARD: matchea siempre. Términos inequívocos del Mundial / selecciones.
const HARD_KEYWORDS = [
  // Frases completas multi-idioma
  'world cup', 'copa del mundo', 'copa mundial', 'copa do mundo',
  'coupe du monde', 'mondiale', 'mundial 2026', 'mundial-2026',
  'weltmeisterschaft', 'fifa world',
  // Selecciones con nombre distintivo (no palabras de uso común)
  'la roja', 'albiceleste', 'canarinha', 'azzurri', 'squadra azzurra',
  'equipe de france', 'mannschaft', 'three lions', 'oranje',
  'samurai blue', 'tri mexicano', 'la blanquirroja', 'la verde',
  // Compuestas seguras
  'mundial de futbol', 'mundial de fútbol', 'mundial femenino',
  'mundial masculino', 'mundial sub-', 'seleccion española',
  'selección española', 'seleccion argentina', 'selección argentina',
  'seleccion mexicana', 'selección mexicana', 'seleccion brasileña',
  'seleção brasileira', 'national team',
];

// SOFT: ruidosas (mundial, seleccion, fifa) — solo matchean si el contexto
// del titular o la URL es claramente futbolístico/deportivo.
const SOFT_KEYWORDS = [
  'mundial', 'seleccion', 'selección', 'fifa', 'wm',
];

// Contexto deportivo: si el haystack contiene alguno de estos términos,
// las SOFT keywords pasan a contar. En URL captura paths típicos.
const SPORT_CONTEXT_RE = /\b(futbol|fútbol|football|soccer|liga|laliga|champions|jugador|jugadora|seleccionador|entrenador|estadio|partido|gol|goles|delantero|delantera|portero|guardameta|fc |club|copa america|eurocopa|euro 2024|euro 2025|euro 2026|mundial 2026)\b/;
const URL_SPORT_CONTEXT_RE = /\/(futbol|football|soccer|seleccion|seleccao|squadra|equipe|laliga|champions|copa-?mundial|world-?cup|mundial)(\/|-|$)/;

function normalize(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const NORM_HARD = HARD_KEYWORDS.map(normalize);
const NORM_SOFT = SOFT_KEYWORDS.map(normalize);

function matchKeyword(title: string, url: string): string | null {
  const t = normalize(title);
  const u = (url || '').toLowerCase();
  // HARD: match en title o url
  for (const k of NORM_HARD) {
    if (k.length <= 3) {
      const re = new RegExp(`\\b${k}\\b`);
      if (re.test(t) || re.test(u)) return k;
    } else if (t.includes(k) || u.includes(k)) {
      return k;
    }
  }
  // SOFT: matchea solo con contexto deportivo. Eso descarta "población mundial",
  // "Selectividad", "El Corte Inglés en la selección de productos", etc.
  const hasSportContext = SPORT_CONTEXT_RE.test(t) || URL_SPORT_CONTEXT_RE.test(u);
  if (!hasSportContext) return null;
  for (const k of NORM_SOFT) {
    if (k.length <= 3) {
      const re = new RegExp(`\\b${k}\\b`);
      if (re.test(t) || re.test(u)) return k;
    } else if (t.includes(k) || u.includes(k)) {
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
      const kw = matchKeyword(a.title || '', a.link || '');
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
      const kw = matchKeyword(p.title || '', url);
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
      // Entidades: usar el nombre como title y vacío como url. Solo HARD aplicará
      // porque no tenemos contexto URL deportivo.
      const kw = matchKeyword(name, '');
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
        const kw = matchKeyword(p.title || '', p.url || '');
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
