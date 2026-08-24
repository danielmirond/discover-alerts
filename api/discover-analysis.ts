import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadState, getState } from '../src/state/store.js';

/**
 * GET /api/discover-analysis
 *
 * Análisis avanzado marco Empty Shelves / Recall (arXiv 2602.14080)
 * combinado con metodología DiscoverMonitor:
 *
 *   1. Head vs Long-tail cohorts (segmentar entidades por popularidad)
 *   2. Denominador contextual (por entidad: N medios cubriendo, DCG total)
 *   3. Share of card vs Share of citation (heurística: pages con 3+
 *      entidades destacadas → posible resumen agrupado)
 *
 * Para cada publisher monitorizado devuelve:
 *   - dcgHead / dcgTail (peso en cabecera vs cola)
 *   - shareHead % / shareTail %
 *   - diagnóstico automático (competitivo en head, débil en tail, etc.)
 *
 * Gated: sport, motor, main (universal — cualquier vertical).
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

/** Blacklist de sustantivos comunes ES/EN que DS a veces trata como entidades
 * pero no aportan editorialmente. Ampliada tras observar top entities en
 * motor/sport (Casa, Ajo, Parabrisas, Vinagre, Tormenta…). */
const ENTITY_BLACKLIST = new Set([
  'casa','ajo','vinagre','parabrisas','sancion','sanción','tormenta','trabajo','trabajador',
  'diesel','diésel','madera','tela','perro','gato','pollo','carne','pescado','pan','agua',
  'sol','luna','fuego','tierra','aire','viento','lluvia','nieve','calor','frio','frío',
  'coche','moto','tren','avion','avión','barco','autobus','autobús','taxi','bici','bicicleta',
  'padre','madre','hijo','hija','abuelo','abuela','esposa','marido','familia','amigo',
  'salud','enfermedad','muerte','vida','amor','odio','miedo','felicidad','tristeza',
  'jubilacion','jubilación','pension','pensión','sueldo','salario','impuesto','multa',
  'hospital','clinica','clínica','farmacia','banco','tienda','supermercado','mercado',
  'peligro','riesgo','error','problema','solucion','solución','clave','razon','razón',
  'motivo','causa','efecto','consecuencia','opinion','opinión','idea','tema',
  'primera','segunda','tercera','ultima','última','mejor','peor','antes','ahora','hoy',
  'espana','españa','europa','mundo','pais','país','ciudad','pueblo','barrio',
]);

/** Determina si una entidad es editorialmente útil.
 * Combina KG Wikidata (si disponible) + heurísticas de forma. */
function isValidEntity(name: string, kg?: any): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length < 4) return false;
  const norm = normalize(trimmed);
  if (ENTITY_BLACKLIST.has(norm)) return false;
  // Si tenemos KG, priorizar Person/Organization/Place/Event/Work
  if (kg && kg.type) {
    if (['Person', 'Organization', 'Place', 'Event', 'Work'].includes(kg.type)) return true;
    if (kg.type === 'Other') {
      // Filtrar 'Other' si el KG dice que es clase-común (Q144 Perro, Q287 Madera, Q123414 Estrés)
      const desc = (kg.description || '').toLowerCase();
      if (/clase de|tipo de|especialidad|campo de estudio|modo de fallo|type of|kind of|class of/i.test(desc)) return false;
    }
  }
  // Si es minúscula-inicial y una sola palabra → probablemente sustantivo común
  const isSingleLower = /^[a-záéíóúñü]+$/i.test(trimmed) && !/^[A-ZÁÉÍÓÚÑÜ]/.test(trimmed);
  if (isSingleLower) return false;
  // Al menos empieza con mayúscula O tiene ≥2 palabras
  const hasCapital = /^[A-ZÁÉÍÓÚÑÜ]/.test(trimmed);
  const isMultiword = trimmed.split(/\s+/).length >= 2;
  return hasCapital || isMultiword;
}

interface EntityStat {
  entity: string;
  score: number;
  publications: number;
  position: number;
  /** DCG total de esta entidad (suma sobre pages que la mencionan). */
  dcgTotal: number;
  /** Publishers distintos cubriendo la entidad. */
  publishersCount: number;
  /** Top 3 publishers por DCG en esta entidad. */
  topPublishers: Array<{ domain: string; dcg: number; sharePct: number }>;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    await loadState();
    const s = getState() as any;
    const pages = (s.pages || {}) as Record<string, any>;
    const entitiesRaw = (s.entities || {}) as Record<string, any>;
    const kg = (s.entityKgEnrichment || {}) as Record<string, any>;
    // Filtrar entidades editorialmente útiles (KG + heurísticas)
    const entities: Record<string, any> = {};
    for (const [name, e] of Object.entries(entitiesRaw)) {
      if (isValidEntity(name, kg[name])) entities[name] = e;
    }

    // ── 1. Análisis por entidad (denominador contextual) ─────────────────
    // Para cada entidad DS: cuántos publishers la cubren, DCG total, share del top.
    const entityIndex = new Map<string, {
      entity: string;
      score: number; publications: number; position: number;
      publisherDcg: Map<string, number>;
    }>();

    for (const [name, e] of Object.entries(entities)) {
      entityIndex.set(name, {
        entity: name,
        score: (e as any).score || 0,
        publications: (e as any).publications || 0,
        position: (e as any).position || 999,
        publisherDcg: new Map(),
      });
    }

    // Recorrer pages y atribuir DCG a la entidad × publisher
    for (const [url, p] of Object.entries(pages)) {
      const title = (p as any).title || '';
      if (!title) continue;
      const titleNorm = normalize(title);
      const dom = ((p as any).domain || extractDomain(url) || '').replace(/^www\./, '').toLowerCase();
      if (!dom) continue;
      const w = DCG((p as any).position);

      // Match por substring de titular (entidad en el titular)
      for (const [entName, agg] of entityIndex) {
        const eNorm = normalize(entName);
        if (eNorm.length < 3) continue;
        if (!titleNorm.includes(eNorm)) continue;
        agg.publisherDcg.set(dom, (agg.publisherDcg.get(dom) || 0) + w);
      }
    }

    // Construir stats por entidad
    const entityStats: EntityStat[] = [];
    for (const [, agg] of entityIndex) {
      const totalDcg = [...agg.publisherDcg.values()].reduce((s, v) => s + v, 0);
      const pubs = agg.publisherDcg.size;
      if (pubs === 0) continue;
      const sorted = [...agg.publisherDcg.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([domain, dcg]) => ({
          domain,
          dcg: Math.round(dcg * 100) / 100,
          sharePct: totalDcg > 0 ? Math.round((dcg / totalDcg) * 1000) / 10 : 0,
        }));
      entityStats.push({
        entity: agg.entity,
        score: agg.score,
        publications: agg.publications,
        position: agg.position,
        dcgTotal: Math.round(totalDcg * 100) / 100,
        publishersCount: pubs,
        topPublishers: sorted,
      });
    }
    entityStats.sort((a, b) => b.dcgTotal - a.dcgTotal);

    // ── 2. Head vs Long-tail cohorts ─────────────────────────────────────
    // Head = top 20% de entidades por DCG total (donde está la cabecera).
    // Tail = restante 80% (nichos, cola larga).
    const headCutoff = Math.max(1, Math.floor(entityStats.length * 0.2));
    const headEntities = new Set(entityStats.slice(0, headCutoff).map(e => e.entity));
    const tailEntities = new Set(entityStats.slice(headCutoff).map(e => e.entity));

    // Para cada publisher: DCG total en head, en tail, y % de cuota en cada cohort.
    const publisherStats = new Map<string, { dcgHead: number; dcgTail: number; totalHead: number; totalTail: number }>();
    let totalDcgHead = 0;
    let totalDcgTail = 0;

    for (const stat of entityStats) {
      const isHead = headEntities.has(stat.entity);
      for (const [, agg] of entityIndex) {
        if (agg.entity !== stat.entity) continue;
        for (const [dom, dcg] of agg.publisherDcg) {
          let ps = publisherStats.get(dom);
          if (!ps) { ps = { dcgHead: 0, dcgTail: 0, totalHead: 0, totalTail: 0 }; publisherStats.set(dom, ps); }
          if (isHead) { ps.dcgHead += dcg; totalDcgHead += dcg; }
          else { ps.dcgTail += dcg; totalDcgTail += dcg; }
        }
      }
    }

    // ── 3. Share of card vs citation heurística ──────────────────────────
    // Heurística: page con 4+ entidades detectadas en el titular → probable
    // "digest / cita en resumen". Page con 1 entidad clara → card propia.
    let sharesOfCard = 0;
    let sharesOfCitation = 0;
    for (const [url, p] of Object.entries(pages)) {
      const title = (p as any).title || '';
      if (!title) continue;
      const titleNorm = normalize(title);
      let matches = 0;
      for (const entName of entityIndex.keys()) {
        const eNorm = normalize(entName);
        if (eNorm.length >= 4 && titleNorm.includes(eNorm)) matches++;
        if (matches >= 4) break;
      }
      if (matches >= 4) sharesOfCitation++;
      else sharesOfCard++;
    }

    // ── Publisher cohort analysis con diagnóstico automático ─────────────
    const publisherCohorts = [...publisherStats.entries()]
      .map(([domain, ps]) => {
        const shareHead = totalDcgHead > 0 ? Math.round((ps.dcgHead / totalDcgHead) * 1000) / 10 : 0;
        const shareTail = totalDcgTail > 0 ? Math.round((ps.dcgTail / totalDcgTail) * 1000) / 10 : 0;
        // Diagnóstico automático basado en comparación cohort
        let diagnosis = 'balanceado';
        if (shareHead >= 5 && shareTail < 2) diagnosis = 'competitivo en head · débil en tail';
        else if (shareTail >= 5 && shareHead < 2) diagnosis = 'fuerte en cola larga · ausente en head';
        else if (shareHead >= 5 && shareTail >= 5) diagnosis = 'dominante ambas cohortes';
        else if (shareHead < 1 && shareTail < 1) diagnosis = 'presencia marginal';
        return {
          domain,
          dcgHead: Math.round(ps.dcgHead * 100) / 100,
          dcgTail: Math.round(ps.dcgTail * 100) / 100,
          shareHead, shareTail,
          diagnosis,
        };
      })
      .filter(p => p.dcgHead > 0 || p.dcgTail > 0)
      .sort((a, b) => (b.shareHead + b.shareTail) - (a.shareHead + a.shareTail));

    res.setHeader('Cache-Control', 's-maxage=300');
    res.json({
      framework: 'Empty Shelves / Recall (arXiv 2602.14080) + DiscoverMonitor DCG',
      computedAt: new Date().toISOString(),
      summary: {
        totalEntities: entityStats.length,
        headCount: headEntities.size,
        tailCount: tailEntities.size,
        totalPages: Object.keys(pages).length,
        cardVsCitation: {
          card: sharesOfCard,
          citation: sharesOfCitation,
          citationPct: (sharesOfCard + sharesOfCitation) > 0
            ? Math.round((sharesOfCitation / (sharesOfCard + sharesOfCitation)) * 1000) / 10
            : 0,
          note: 'Heurística: page con 4+ entidades destacadas en titular → posible digest/resumen agrupado. Card = card propia (única entidad).',
        },
      },
      // Top entidades con denominador contextual
      entityDenominators: entityStats.slice(0, 30),
      // Cohorts head vs tail
      publisherCohorts: publisherCohorts.slice(0, 30),
      // Entidades cabecera (para inspección)
      headEntities: entityStats.slice(0, headCutoff).map(e => ({
        entity: e.entity, dcgTotal: e.dcgTotal, publishersCount: e.publishersCount,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
