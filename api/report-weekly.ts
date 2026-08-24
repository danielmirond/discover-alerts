import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadState, getState } from '../src/state/store.js';

/**
 * GET /api/report-weekly?format=md
 *
 * Informe semanal consolidado que replica la metodología del deliverable
 * SEO de DiscoverMonitor / Semana.es aplicado al framework Empty Shelves.
 *
 * Combina:
 *  - Encoding score global + distribución (Fase 1)
 *  - DCG share por publisher (Fase 1)
 *  - Head/Tail cohorts con diagnóstico (Fase 2)
 *  - Denominador contextual por top entidad (Fase 2)
 *  - Producción vs Encoded vs Discover con recall real (Fase 1)
 *  - Search Profiles status (Fase 3)
 *
 * Formato:
 *   - format=json (default): estructura para dashboard
 *   - format=md: Markdown listo para pegar en Claude/ChatGPT o compartir a redacción
 */

const DCG = (pos: number | undefined): number => {
  const p = typeof pos === 'number' && pos > 0 ? pos : 30;
  return 1 / Math.log2(p + 1);
};

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}

function normalize(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const EMBED_DOMAINS = new Set(['youtube.com','youtu.be','twitter.com','x.com','tiktok.com','instagram.com','threads.com','threads.net','facebook.com','fb.watch']);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await loadState();
    const s = getState() as any;
    const format = (req.query.format || 'json') as string;
    const instance = (process.env.INSTANCE_NAME || 'main').toLowerCase();

    const pages = (s.pages || {}) as Record<string, any>;
    const audits = (s.contentAudits || {}) as Record<string, any>;
    const articles = (s.mediaArticles || {}) as Record<string, any>;
    const entities = (s.entities || {}) as Record<string, any>;
    const searchProfiles = (s.searchProfiles || {}) as Record<string, any>;

    // ── Encoding global ─────────────────────────────────────────────────
    const scores: number[] = [];
    const validAudits: any[] = [];
    for (const a of Object.values(audits)) {
      const aa = a as any;
      if (aa.error) continue;
      const pub = (aa.publisher || '').replace(/^www\./, '').toLowerCase();
      if (EMBED_DOMAINS.has(pub)) continue;
      if (aa.encodingScore != null) {
        scores.push(aa.encodingScore);
        validAudits.push(aa);
      }
    }
    scores.sort((a, b) => a - b);
    const encoding = {
      sample: scores.length,
      mean: scores.length > 0 ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : 0,
      median: scores.length > 0 ? scores[Math.floor(scores.length / 2)] : 0,
      excellent: scores.filter(s => s >= 80).length,
      good: scores.filter(s => s >= 60 && s < 80).length,
      weak: scores.filter(s => s >= 40 && s < 60).length,
      broken: scores.filter(s => s < 40).length,
    };

    // ── DCG por publisher (pages 48h) ───────────────────────────────────
    const nowMs = Date.now();
    const dayMs = 24 * 3600_000;
    const publisherDcg = new Map<string, { dcg48h: number; dcgToday: number; pages: number }>();
    let totalDcg48h = 0;
    let totalDcgToday = 0;
    for (const [url, p] of Object.entries(pages)) {
      const pp = p as any;
      if (!pp.title) continue;
      const dom = (pp.domain || extractDomain(url) || '').replace(/^www\./, '');
      if (!dom) continue;
      const w = DCG(pp.position);
      totalDcg48h += w;
      const firstMs = pp.firstSeen ? new Date(pp.firstSeen).getTime() : 0;
      const isToday = firstMs && (nowMs - firstMs) <= dayMs;
      if (isToday) totalDcgToday += w;
      let ps = publisherDcg.get(dom);
      if (!ps) { ps = { dcg48h: 0, dcgToday: 0, pages: 0 }; publisherDcg.set(dom, ps); }
      ps.dcg48h += w;
      ps.pages++;
      if (isToday) ps.dcgToday += w;
    }
    const topDcg = [...publisherDcg.entries()]
      .map(([domain, ps]) => ({
        domain, pages: ps.pages,
        dcg48h: Math.round(ps.dcg48h * 100) / 100,
        shareDcg48h: totalDcg48h > 0 ? Math.round((ps.dcg48h / totalDcg48h) * 1000) / 10 : 0,
        shareDcgToday: totalDcgToday > 0 ? Math.round((ps.dcgToday / totalDcgToday) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.shareDcg48h - a.shareDcg48h)
      .slice(0, 15);

    // ── Producción / Recall (24h) ──────────────────────────────────────
    const producedByDom = new Map<string, number>();
    for (const [, a] of Object.entries(articles)) {
      const pubMs = a.pubDate ? new Date(a.pubDate).getTime() : NaN;
      const firstMs = a.firstSeen ? new Date(a.firstSeen).getTime() : NaN;
      const refMs = !isNaN(pubMs) ? pubMs : firstMs;
      if (isNaN(refMs) || nowMs - refMs > dayMs) continue;
      const dom = extractDomain(a.link);
      if (!dom) continue;
      producedByDom.set(dom, (producedByDom.get(dom) || 0) + 1);
    }
    const encodedByDom = new Map<string, number>();
    for (const a of validAudits) {
      if (a.encodingScore < 60) continue;
      const dom = extractDomain(a.url);
      if (!dom) continue;
      encodedByDom.set(dom, (encodedByDom.get(dom) || 0) + 1);
    }
    const production = [...producedByDom.entries()]
      .map(([domain, prod]) => {
        const enc = encodedByDom.get(domain) || 0;
        const disc = publisherDcg.get(domain)?.pages || 0;
        return {
          domain, produced: prod, encoded: enc, discover: disc,
          ratio: prod > 0 ? Math.round((disc / prod) * 1000) / 10 : 0,
          recallOfEncoded: enc > 0 ? Math.round((disc / enc) * 1000) / 10 : 0,
        };
      })
      .filter(p => p.produced >= 3)
      .sort((a, b) => b.produced - a.produced)
      .slice(0, 15);

    // ── Head/Tail cohorts básico ────────────────────────────────────────
    const entityDcg = new Map<string, number>();
    for (const [url, p] of Object.entries(pages)) {
      const title = (p as any).title || '';
      if (!title) continue;
      const titleNorm = normalize(title);
      const w = DCG((p as any).position);
      for (const entName of Object.keys(entities)) {
        const en = normalize(entName);
        if (en.length < 4) continue;
        if (titleNorm.includes(en)) {
          entityDcg.set(entName, (entityDcg.get(entName) || 0) + w);
        }
      }
    }
    const topEntities = [...entityDcg.entries()]
      .map(([entity, dcg]) => ({ entity, dcg: Math.round(dcg * 100) / 100 }))
      .sort((a, b) => b.dcg - a.dcg)
      .slice(0, 10);

    // ── Search profiles status ──────────────────────────────────────────
    const spDetected = Object.values(searchProfiles).filter((sp: any) => sp.detected).length;
    const spTotal = Object.keys(searchProfiles).length;

    const payload = {
      framework: 'Empty Shelves / Recall (arXiv 2602.14080) + DiscoverMonitor DCG',
      instance,
      generatedAt: new Date().toISOString(),
      encoding,
      dcgShare: topDcg,
      production,
      topEntities,
      searchProfiles: {
        detected: spDetected, total: spTotal,
        detectedPct: spTotal > 0 ? Math.round((spDetected / spTotal) * 100) : 0,
      },
    };

    if (format === 'md') {
      const md = renderMarkdown(payload);
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `inline; filename="report-${instance}-${new Date().toISOString().slice(0, 10)}.md"`);
      res.setHeader('Cache-Control', 's-maxage=300');
      res.send(md);
      return;
    }

    res.setHeader('Cache-Control', 's-maxage=300');
    res.json(payload);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

function renderMarkdown(p: any): string {
  const date = new Date(p.generatedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  const lines: string[] = [];
  lines.push(`# Informe Discover — instancia ${p.instance}`);
  lines.push(`_${date} · framework: ${p.framework}_`);
  lines.push('');
  lines.push('## 1. Encoding — elegibilidad técnica del contenido');
  lines.push('');
  lines.push(`Marco Empty Shelves: ¿cuántas pages producidas cumplen los mínimos técnicos para entrar en Discover?`);
  lines.push('');
  lines.push(`- **Sample auditado**: ${p.encoding.sample} pages`);
  lines.push(`- **Score medio**: ${p.encoding.mean}/100 · mediana ${p.encoding.median}`);
  lines.push(`- **Buckets**: excellent (≥80): ${p.encoding.excellent} · good (60-79): ${p.encoding.good} · weak (40-59): ${p.encoding.weak} · broken (<40): ${p.encoding.broken}`);
  lines.push('');
  lines.push('## 2. DCG share — cuota de visibilidad ponderada por posición');
  lines.push('');
  lines.push(`Peso por posición: 1/log2(pos+1). Aparecer #1 pesa 5× más que #20.`);
  lines.push('');
  lines.push('| Publisher | Pages 48h | DCG 48h | Share 48h | Share 24h |');
  lines.push('|---|---:|---:|---:|---:|');
  for (const r of p.dcgShare) {
    lines.push(`| ${r.domain} | ${r.pages} | ${r.dcg48h} | **${r.shareDcg48h}%** | ${r.shareDcgToday}% |`);
  }
  lines.push('');
  lines.push('## 3. Producción / Encoded / Recall');
  lines.push('');
  lines.push('Marco Empty Shelves: separar el problema técnico (encoding) del editorial (recall).');
  lines.push('');
  lines.push('| Publisher | Producido 24h | Encoded | Discover hits | Ratio bruto | **Recall real** |');
  lines.push('|---|---:|---:|---:|---:|---:|');
  for (const r of p.production) {
    lines.push(`| ${r.domain} | ${r.produced} | ${r.encoded} | ${r.discover} | ${r.ratio}% | **${r.recallOfEncoded}%** |`);
  }
  lines.push('');
  lines.push('## 4. Top entidades por DCG (denominador contextual)');
  lines.push('');
  for (const e of p.topEntities) {
    lines.push(`- **${e.entity}** — DCG ${e.dcg}`);
  }
  lines.push('');
  lines.push('## 5. Search Profiles (Google, junio 2026)');
  lines.push('');
  lines.push(`Publishers con Search Profile detectado: **${p.searchProfiles.detected}/${p.searchProfiles.total}** (${p.searchProfiles.detectedPct}%)`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Diagnóstico y prompt sugerido');
  lines.push('');
  lines.push('```');
  lines.push('Actúa como analista SEO de un medio. Te paso el informe semanal Discover');
  lines.push('con el framework Empty Shelves / Recall.');
  lines.push('');
  lines.push('Analiza:');
  lines.push('1. ¿Nuestro problema principal es encoding (elegibilidad) o recall (recuperación)?');
  lines.push('2. Qué publishers están capturando la cabecera y cuál es nuestro gap.');
  lines.push('3. Qué entidades tenemos como oportunidad (denominador bajo).');
  lines.push('4. Recomendación editorial concreta para los próximos 7 días.');
  lines.push('');
  lines.push('No inventes datos. Si falta contexto, márcalo como "verificar".');
  lines.push('```');
  return lines.join('\n');
}
