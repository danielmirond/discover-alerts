import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DiscoverPage } from '../types.js';
import { extractEntityName } from './entity-detector.js';

/**
 * Topic-based classifier, ortogonal a las categorias de DiscoverSnoop.
 *
 * Uso: cada entidad hereda un "topic" (sucesos, legal, ...) en funcion de
 * las keywords que aparecen en los titulares de las paginas donde la entidad
 * esta listada. Si una entidad no matchea ningun topic, queda sin topic
 * y el routing cae al comportamiento por categoria.
 */

export interface TopicDefinition {
  id: string;
  label: string;
  /** Minimum distinct keyword hits to classify. Default: 1. */
  minKeywords?: number;
  /** Keywords to match (already normalized: lowercase, no accents). */
  keywords: string[];
  /** If any of these matches, cancel the topic (false positive filter). */
  excludeKeywords?: string[];
}

export interface TopicsDictionary {
  topics: TopicDefinition[];
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

let cached: TopicsDictionary | null = null;

/**
 * Loads topics.json once per process. Falls back to empty dictionary if
 * the file is missing or malformed — in that case the classifier is a no-op
 * and the existing category-based routing is preserved.
 */
export async function loadTopicsDictionary(): Promise<TopicsDictionary> {
  if (cached) return cached;
  const path = join(process.cwd(), process.env.TOPICS_PATH || 'topics.json');
  try {
    const raw = await readFile(path, 'utf-8');
    const parsed = JSON.parse(raw) as TopicsDictionary;
    if (!Array.isArray(parsed.topics)) throw new Error('topics.json: missing topics[]');
    // Pre-normalize keywords once to avoid per-call work
    for (const t of parsed.topics) {
      t.keywords = (t.keywords || []).map(k => normalize(k)).filter(k => k.length > 0);
      t.excludeKeywords = (t.excludeKeywords || []).map(k => normalize(k)).filter(k => k.length > 0);
    }
    cached = parsed;
    console.log(`[topics] Loaded ${parsed.topics.length} topics from ${path}`);
    return parsed;
  } catch (err) {
    console.warn(`[topics] Could not load ${path}, topic classifier disabled:`, (err as Error).message);
    cached = { topics: [] };
    return cached;
  }
}

/**
 * Classify a single normalized text snippet. Returns a map of topicId -> hit count.
 * Empty map if nothing matches. Applies excludeKeywords to reset a topic's count
 * to 0 if the exclude fires (so you can remove false positives like "herido" on sport).
 */
export function classifyText(textNorm: string, dict: TopicsDictionary): Record<string, number> {
  const hits: Record<string, number> = {};
  if (!textNorm || dict.topics.length === 0) return hits;

  for (const topic of dict.topics) {
    let count = 0;
    for (const kw of topic.keywords) {
      if (textNorm.includes(kw)) count++;
    }
    if (count === 0) continue;
    // Exclude-keyword veto
    const excludes = topic.excludeKeywords || [];
    if (excludes.length > 0) {
      for (const ex of excludes) {
        if (textNorm.includes(ex)) { count = 0; break; }
      }
    }
    const minKw = topic.minKeywords ?? 1;
    if (count >= minKw) hits[topic.id] = count;
  }
  return hits;
}

/**
 * Picks the topic id with the most hits. Ties broken by dictionary order
 * (stable, deterministic across polls).
 */
export function pickBestTopic(hits: Record<string, number>, dict: TopicsDictionary): string | undefined {
  let best: string | undefined;
  let bestCount = 0;
  for (const topic of dict.topics) {
    const c = hits[topic.id] || 0;
    if (c > bestCount) { best = topic.id; bestCount = c; }
  }
  return best;
}

/**
 * Replica de buildEntityCategoryMap pero para topics. Voto mayoritario
 * sobre las paginas en las que aparece cada entidad, clasificando los
 * titulares con el diccionario de topics.
 */
export function buildEntityTopicMap(
  pages: DiscoverPage[],
  dict: TopicsDictionary,
): Record<string, string> {
  if (dict.topics.length === 0) return {};

  const counts: Record<string, Record<string, number>> = {};

  for (const page of pages) {
    const rawEntities = (page.entities as unknown as unknown[] | undefined) || [];
    if (rawEntities.length === 0) continue;
    const titleNorm = normalize(page.title || page.title_original || '');
    if (!titleNorm) continue;
    const pageHits = classifyText(titleNorm, dict);
    if (Object.keys(pageHits).length === 0) continue;

    for (const rawEnt of rawEntities) {
      const entityName = extractEntityName(rawEnt);
      if (!entityName) continue;
      if (!counts[entityName]) counts[entityName] = {};
      for (const [topicId, hit] of Object.entries(pageHits)) {
        counts[entityName][topicId] = (counts[entityName][topicId] ?? 0) + hit;
      }
    }
  }

  const result: Record<string, string> = {};
  for (const [entityName, topicCounts] of Object.entries(counts)) {
    const best = pickBestTopic(topicCounts, dict);
    if (best) result[entityName] = best;
  }
  return result;
}
