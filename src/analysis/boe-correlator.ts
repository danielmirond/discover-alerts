import { config } from '../config.js';
import { getState, updateState } from '../state/store.js';
import type {
  BoeItem,
  DiscoverEntity,
  DiscoverPage,
  BoeDiscoverCorrelationAlert,
} from '../types.js';

function diceCoefficient(a: string, b: string): number {
  const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const aN = norm(a);
  const bN = norm(b);

  if (aN === bN) return 1;
  if (aN.length < 2 || bN.length < 2) return 0;

  const bigramsA = new Set<string>();
  for (let i = 0; i < aN.length - 1; i++) bigramsA.add(aN.slice(i, i + 2));

  let intersection = 0;
  const bigramsBSize = bN.length - 1;
  for (let i = 0; i < bN.length - 1; i++) {
    if (bigramsA.has(bN.slice(i, i + 2))) intersection++;
  }

  return (2 * intersection) / (bigramsA.size + bigramsBSize);
}

function normalizeForSubstring(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function detectBoeDiscoverCorrelations(
  boeItems: BoeItem[],
  entities: DiscoverEntity[],
  pages: DiscoverPage[],
): BoeDiscoverCorrelationAlert[] {
  const state = getState();
  const threshold = config.thresholds.trendCorrelationMin;
  const alerts: BoeDiscoverCorrelationAlert[] = [];
  const now = new Date().toISOString();

  const prevBoeItems = state.boeItems;
  const nextBoeItems: Record<string, { firstSeen: string }> = {};

  for (const boe of boeItems) {
    if (!boe.titulo) continue;

    const boeKey = boe.identificador || boe.titulo;
    nextBoeItems[boeKey] = {
      firstSeen: prevBoeItems[boeKey]?.firstSeen ?? now,
    };

    // Skip items we've already processed
    if (prevBoeItems[boeKey]) continue;

    const matchingEntities: string[] = [];
    const matchingPageTitles: string[] = [];
    let bestScore = 0;

    // Check against Discover entities
    for (const entity of entities) {
      const boeNorm = normalizeForSubstring(boe.titulo);
      const entityNorm = normalizeForSubstring((entity as any).entity ?? (entity as any).name);

      // Substring match: entity name appears in BOE title
      if (boeNorm.includes(entityNorm) && entityNorm.length > 3) {
        matchingEntities.push((entity as any).entity ?? (entity as any).name);
        bestScore = Math.max(bestScore, 0.9);
        continue;
      }

      // Fuzzy match
      const sim = diceCoefficient(boe.titulo, (entity as any).entity ?? (entity as any).name);
      if (sim >= threshold) {
        matchingEntities.push((entity as any).entity ?? (entity as any).name);
        bestScore = Math.max(bestScore, sim);
      }
    }

    // Check against Discover pages
    for (const page of pages) {
      const pageTitle = page.title || page.title_original || '';
      if (!pageTitle) continue;

      const sim = diceCoefficient(boe.titulo, pageTitle);
      if (sim >= threshold) {
        matchingPageTitles.push(pageTitle);
        bestScore = Math.max(bestScore, sim);
      }
    }

    if (matchingEntities.length > 0 || matchingPageTitles.length > 0) {
      const boeUrl = boe.urlPdf
        || boe.urlHtml
        || (boe.identificador ? `https://www.boe.es/diario_boe/txt.php?id=${boe.identificador}` : '');

      alerts.push({
        type: 'boe_discover_correlation',
        boeTitle: boe.titulo,
        boeId: boe.identificador,
        boeUrl,
        departamento: boe.departamento,
        seccion: boe.seccion,
        matchingEntities,
        matchingPageTitles: matchingPageTitles.slice(0, 5),
        similarityScore: bestScore,
      });
    }
  }

  updateState({ boeItems: nextBoeItems });
  return alerts;
}
