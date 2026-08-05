import { updateState, saveState, loadState, getState } from '../state/store.js';
import { auditBatch } from '../sources/content-audit.js';
import type { ContentAuditResult } from '../sources/content-audit.js';

/**
 * Poll diario que audita las pages top de Discover ES /Sports.
 * Persiste resultados en state.contentAudits con retención de 30 días.
 *
 * Objetivo: que el redactor de ED tenga estadísticas diarias del formato
 * editorial que sobrevive en Discover /Sports — wordCount típico,
 * encabezados, número de imágenes/vídeos por página.
 *
 * Cadencia recomendada: 1×/día (4:00 UTC). Audita ~80 URLs por run
 * con throttle 300ms = ~25s. Cabe sobrado en timeout GH Actions.
 */

export interface ContentAuditEntry extends ContentAuditResult {
  /** Snapshot del score Discover cuando se auditó. */
  scoreSnapshot?: number;
  /** Posición Discover cuando se auditó. */
  positionSnapshot?: number;
  /** Categoría DS. */
  category?: string;
  /** ISO timestamp del audit. */
  auditedAt: string;
}

const RETENTION_DAYS = 30;
const TOP_N = 80;

/** Devuelve los prefijos de categoría a auditar. Si DS_CATEGORY_FILTER está
 * definido (motor, sport, etc.) usa esos prefijos. Si no, acepta todo.
 * El discover-poll ya filtra las pages a la categoría de la instancia, así
 * que este filtro es una red de seguridad extra (por si state.pages tiene
 * residuos de configuraciones anteriores). */
function getPrefixes(): string[] | null {
  const env = process.env.DS_CATEGORY_FILTER;
  if (env && env.trim()) {
    return env.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  }
  return null;
}
function isInScope(c: string | number | undefined, prefixes: string[] | null): boolean {
  if (!prefixes) return true; // sin filter: aceptar todo
  if (c == null) return true; // page sin categoría → asumimos que discover-poll ya la filtró
  if (typeof c === 'number') return true;
  const lower = String(c).toLowerCase();
  if (lower === '' || lower === '-') return true;
  return prefixes.some(p => lower.startsWith(p));
}

export async function runContentAuditPoll(): Promise<void> {
  await loadState();
  console.log('[content-audit] Starting daily poll...');
  const state = getState() as any;
  const pages = (state.pages || {}) as Record<string, any>;

  // Seleccionar top N pages en scope (categoría del vertical) ordenadas por score desc
  const prefixes = getPrefixes();
  const sportPages = Object.entries(pages)
    .filter(([, p]) => isInScope(p.category, prefixes))
    .map(([url, p]) => ({ url, ...p }))
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, TOP_N);

  console.log(`[content-audit] ${sportPages.length} pages /Sports candidatas (de ${Object.keys(pages).length} totales)`);
  if (sportPages.length === 0) {
    console.log('[content-audit] sin pages — saltando');
    return;
  }

  // Auditar
  const t0 = Date.now();
  const results = await auditBatch(sportPages.map(p => p.url), 300);
  const elapsedS = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[content-audit] ${results.length} URLs auditadas en ${elapsedS}s`);

  // Merge con state previo
  const prev: Record<string, ContentAuditEntry> = state.contentAudits || {};
  const now = new Date().toISOString();
  const nowMs = Date.now();
  const RETENTION_MS = RETENTION_DAYS * 24 * 3600_000;

  // Mantener entries antiguas dentro de la ventana
  const next: Record<string, ContentAuditEntry> = {};
  for (const [url, e] of Object.entries(prev)) {
    const t = new Date(e.auditedAt).getTime();
    if (!isNaN(t) && nowMs - t <= RETENTION_MS) next[url] = e;
  }

  // Añadir nuevas auditorías
  let ok = 0, errs = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const pageMeta = sportPages[i];
    if (r.error) { errs++; }
    else { ok++; }
    next[r.url] = {
      ...r,
      auditedAt: now,
      scoreSnapshot: pageMeta?.score || 0,
      positionSnapshot: pageMeta?.position,
      category: pageMeta?.category,
    };
  }

  // Distribución por publisher (log)
  const byPub: Record<string, number> = {};
  for (const r of results) {
    if (!r.error && r.publisher) byPub[r.publisher] = (byPub[r.publisher] || 0) + 1;
  }
  const topPubs = Object.entries(byPub).sort((a, b) => b[1] - a[1]).slice(0, 8);
  console.log(`[content-audit] ok=${ok} err=${errs} · top pubs: ${topPubs.map(([p, n]) => `${p}=${n}`).join(' · ')}`);

  console.log(`[content-audit] state.contentAudits → ${Object.keys(next).length} entries (retención ${RETENTION_DAYS}d)`);

  updateState({
    contentAudits: next,
    lastPollContentAudit: now,
  } as any);
  try { await saveState(); } catch (err) { console.error('[content-audit] saveState:', err); }
  console.log('[content-audit] Poll complete');
}
