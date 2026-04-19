/**
 * Helper compartido para extraer "contextSnippets": 2-3 frases reales de
 * Discover pages y/o RSS article descriptions donde aparece la entidad.
 *
 * Priorizamos snippets de Discover (es lo que Google realmente muestra al
 * usuario), y complementamos con descriptions de RSS cuando falta texto.
 * Deduplicado por prefijo normalizado 80ch. Todos limpios de HTML + truncados.
 */

import type { DiscoverPage } from '../types.js';
import { getState } from '../state/store.js';
import { extractEntityName } from './entity-detector.js';

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

export function cleanSnippet(raw: string | undefined, maxLen = 160): string {
  if (!raw) return '';
  let s = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  if (s.length > maxLen) {
    const slice = s.slice(0, maxLen);
    const lastSpace = slice.lastIndexOf(' ');
    s = (lastSpace > maxLen - 40 ? slice.slice(0, lastSpace) : slice).trim() + '…';
  }
  return s;
}

/**
 * Extrae hasta `maxSnippets` frases de contexto reales para una entidad.
 * @param entityName nombre exacto de la entidad (se busca por substring normalizado)
 * @param pages páginas DiscoverSnoop del poll actual (opcional, priorizadas si hay)
 * @param mediaMaxAgeMs ventana para filtrar artículos RSS (default 12h)
 */
export function extractContextSnippets(
  entityName: string,
  pages: DiscoverPage[] = [],
  maxSnippets = 3,
  mediaMaxAgeMs = 12 * 3600_000,
): string[] {
  const state = getState();
  const entityNorm = normalize(entityName);
  if (entityNorm.length < 3) return [];

  const out: string[] = [];
  const seen = new Set<string>();
  const nowMs = Date.now();

  function addSnippet(s: string | undefined) {
    const cleaned = cleanSnippet(s);
    if (!cleaned || cleaned.length < 30) return;
    const key = normalize(cleaned.slice(0, 80));
    if (seen.has(key)) return;
    seen.add(key);
    out.push(cleaned);
  }

  // (1) Discover pages del poll actual (máxima prioridad)
  for (const page of pages) {
    if (out.length >= maxSnippets) break;
    if (!page.snippet) continue;
    const titleNorm = normalize(page.title || '');
    const snippetNorm = normalize(page.snippet);
    const entityInPage = ((page.entities as unknown as unknown[]) || []).some(e => extractEntityName(e) === entityName) ||
      titleNorm.includes(entityNorm) ||
      snippetNorm.includes(entityNorm);
    if (entityInPage) addSnippet(page.snippet);
  }

  // (2) RSS media article descriptions (backup)
  if (out.length < maxSnippets) {
    for (const meta of Object.values(state.mediaArticles)) {
      if (out.length >= maxSnippets) break;
      const description = (meta as any).description;
      if (!description || !meta.title) continue;
      const titleNorm = normalize(meta.title);
      if (!titleNorm.includes(entityNorm)) continue;
      const pubTs = (meta as any).pubDate ? new Date((meta as any).pubDate).getTime() : NaN;
      const refTs = !isNaN(pubTs) ? pubTs : new Date(meta.firstSeen).getTime();
      if (nowMs - refTs > mediaMaxAgeMs) continue;
      addSnippet(description);
    }
  }

  return out;
}
