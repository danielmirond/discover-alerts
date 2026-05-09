import { loadState, getState, updateState, saveState } from '../state/store.js';
import { enrichBatch, type KgEnrichment } from '../sources/wikidata.js';

/**
 * Poll diario que enriquece las top entidades trending con datos Wikidata.
 *
 * Cadencia recomendada: 1× cada 6h. Cache permanente en state.entityKgEnrichment
 * (no expira — Wikidata cambia poco; solo refrescamos entidades sin entrada).
 *
 * Estrategia:
 *  - Identificar top 100 entidades activas por score
 *  - Enriquecer las que NO estén ya en cache (max 60 por poll para no abusar
 *    de la API gratuita de Wikidata)
 *  - Persistir en state.entityKgEnrichment
 */
export async function runWikidataPoll(): Promise<void> {
  await loadState();
  const state = getState();
  console.log('[wikidata] Starting...');

  const prev: Record<string, KgEnrichment> = (state as any).entityKgEnrichment || {};
  const beforeSize = Object.keys(prev).length;

  // Top 100 entidades por score que aún no estén en cache
  const candidates = Object.entries(state.entities || {})
    .map(([name, snap]) => ({ name, score: (snap as any).score || 0 }))
    .filter(e => !prev[e.name])
    .sort((a, b) => b.score - a.score)
    .slice(0, 100)
    .map(e => e.name);

  console.log(`[wikidata] cache prev=${beforeSize}, candidates new=${candidates.length}, fetching up to 60`);
  const enriched = await enrichBatch(candidates, prev, 60);
  const afterSize = Object.keys(enriched).length;

  // Cap total a 5000 entradas para no reventar Redis
  const MAX_CACHE = 5000;
  let final = enriched;
  if (Object.keys(enriched).length > MAX_CACHE) {
    const sorted = Object.entries(enriched).sort(([, a], [, b]) =>
      new Date(b.resolvedAt).getTime() - new Date(a.resolvedAt).getTime()
    );
    final = Object.fromEntries(sorted.slice(0, MAX_CACHE));
  }

  console.log(`[wikidata] cache after=${afterSize} (added ${afterSize - beforeSize})`);
  // Distribución por tipo
  const byType: Record<string, number> = {};
  for (const e of Object.values(final)) {
    if (e.notFound) continue;
    byType[e.type || 'Other'] = (byType[e.type || 'Other'] || 0) + 1;
  }
  console.log(`[wikidata] by type:`, JSON.stringify(byType));

  updateState({ entityKgEnrichment: final } as any);
  try { await saveState(); } catch (err) { console.error('[wikidata] saveState:', err); }
  console.log('[wikidata] Poll complete');
}
