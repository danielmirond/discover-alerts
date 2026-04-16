import Anthropic from '@anthropic-ai/sdk';
import { getState, updateState } from '../state/store.js';
import type { TopicsDictionary } from './topic-classifier.js';

/**
 * LLM fallback para clasificar entidades cuando el keyword-matcher de
 * topics.json no devuelve match (o es ambiguo). Diseño:
 *
 *  - **Batched**: una sola llamada por poll con hasta N entidades sin
 *    clasificar. Cada entidad acompañada de hasta 3 titulares de
 *    páginas Discover donde aparece (contexto).
 *  - **Cached**: los resultados se guardan en state.llmTopicCache con
 *    timestamp. Retención 7 días. Nunca re-clasificamos la misma
 *    entidad dos veces en esa ventana.
 *  - **Budget guard**: LLM_CLASSIFIER_ENABLED=false desactiva. El límite
 *    por poll es LLM_CLASSIFIER_MAX_PER_POLL (default 20).
 *  - **Modelo**: Claude Haiku 3.5 (rápido/barato). Prompt + respuesta
 *    ≈ 800 tokens totales por poll = ~$0.001.
 *  - **Fail-open**: si la API falla o timeout, seguimos con topics vacíos.
 */

const MODEL = process.env.LLM_CLASSIFIER_MODEL || 'claude-haiku-4-5';
const CACHE_TTL_MS = 7 * 24 * 3600_000;

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  client = new Anthropic({ apiKey });
  return client;
}

export interface ClassifyRequest {
  entityName: string;
  /** Hasta 3 titulares de páginas donde aparece (contexto editorial). */
  sampleTitles: string[];
}

/**
 * Clasifica un batch de entidades en los topics del diccionario.
 * Devuelve un map entityName -> topicId (o "none"). Respeta la cache y
 * persiste los resultados.
 */
export async function classifyEntitiesBatch(
  requests: ClassifyRequest[],
  dict: TopicsDictionary,
): Promise<Record<string, string>> {
  if (process.env.LLM_CLASSIFIER_ENABLED === 'false') return {};
  if (requests.length === 0 || dict.topics.length === 0) return {};

  const cli = getClient();
  if (!cli) {
    console.warn('[llm-classifier] ANTHROPIC_API_KEY missing, skipping');
    return {};
  }

  // Filter by cache first
  const state = getState();
  const cache = state.llmTopicCache || {};
  const nowMs = Date.now();
  const result: Record<string, string> = {};
  const toClassify: ClassifyRequest[] = [];

  for (const req of requests) {
    const cached = cache[req.entityName];
    if (cached && nowMs - cached.ts <= CACHE_TTL_MS) {
      if (cached.topic !== 'none') result[req.entityName] = cached.topic;
      continue;
    }
    toClassify.push(req);
  }

  if (toClassify.length === 0) return result;

  // Hard cap per poll to control cost
  const maxPerPoll = parseInt(process.env.LLM_CLASSIFIER_MAX_PER_POLL || '20', 10);
  const batch = toClassify.slice(0, maxPerPoll);

  const topicDefs = dict.topics.map(t => `- ${t.id}: ${t.label}`).join('\n');
  const items = batch.map((r, i) => {
    const titles = r.sampleTitles.slice(0, 3).map(t => `    - ${t}`).join('\n');
    return `${i + 1}. "${r.entityName}"\n${titles || '    (sin titulares de contexto)'}`;
  }).join('\n\n');

  const prompt = `Clasifica cada entidad en UNO de estos topics editoriales, o "none" si no encaja:

${topicDefs}
- none: no encaja en ningun topic

Entidades a clasificar (con titulares de contexto entre parentesis):

${items}

Responde SOLO con un JSON array de objetos { "entity": "...", "topic": "..." }. Nada mas.`;

  try {
    const started = Date.now();
    const response = await cli.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    const durationMs = Date.now() - started;

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      console.warn('[llm-classifier] No text block in response');
      return result;
    }
    const raw = textBlock.text.trim();
    // Tolerate fenced code blocks
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('[llm-classifier] No JSON array in response:', raw.slice(0, 200));
      return result;
    }
    const parsed = JSON.parse(jsonMatch[0]) as Array<{ entity: string; topic: string }>;
    const validTopicIds = new Set(dict.topics.map(t => t.id));

    const newCache: Record<string, { topic: string; ts: number }> = { ...cache };
    // Prune expired entries while we touch the cache
    for (const [k, v] of Object.entries(newCache)) {
      if (nowMs - v.ts > CACHE_TTL_MS) delete newCache[k];
    }

    for (const row of parsed) {
      if (!row.entity || !row.topic) continue;
      const topic = String(row.topic).toLowerCase();
      const valid = topic === 'none' || validTopicIds.has(topic);
      if (!valid) continue;
      newCache[row.entity] = { topic, ts: nowMs };
      if (topic !== 'none') result[row.entity] = topic;
    }

    updateState({ llmTopicCache: newCache });
    console.log(
      `[llm-classifier] Classified ${parsed.length}/${batch.length} entities in ${durationMs}ms ` +
      `(input=${response.usage.input_tokens}t output=${response.usage.output_tokens}t)`,
    );
  } catch (err) {
    console.error('[llm-classifier] API error:', (err as Error).message);
    // Fail-open: return whatever we already had from cache
  }

  return result;
}
