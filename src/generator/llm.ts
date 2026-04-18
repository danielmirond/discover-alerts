import Anthropic from '@anthropic-ai/sdk';
import {
  parseJsonLoose,
  validateArticle,
  type GeneratedArticle,
} from './validate.js';

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5';
const MAX_RETRIES = 3;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY env var');
    client = new Anthropic({ apiKey });
  }
  return client;
}

export interface LlmCallOptions {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}

export async function callLlm(opts: LlmCallOptions): Promise<string> {
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 4000,
    temperature: opts.temperature ?? 0.4,
    system: opts.system,
    messages: [{ role: 'user', content: opts.user }],
  });

  const text = res.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('\n')
    .trim();

  if (!text) throw new Error('LLM returned empty response');
  return text;
}

// Llama al LLM y valida el output. Si falla la validacion, reintenta
// hasta MAX_RETRIES veces anadiendo los errores como feedback al prompt.
// Si en el intento 1 el modelo devuelve SKIP (title === "SKIP"), se
// respeta sin reintentar.
export async function callLlmForArticle(
  opts: LlmCallOptions,
): Promise<GeneratedArticle | null> {
  let lastRaw = '';
  let errors: string[] = [];

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const userPrompt =
      errors.length > 0
        ? `${opts.user}\n\n---\n\nTu intento anterior fallo la validacion con estos errores:\n${errors.map(e => `- ${e}`).join('\n')}\n\nCorrige y devuelve el JSON corregido.`
        : opts.user;

    try {
      lastRaw = await callLlm({ ...opts, user: userPrompt });
      const parsed = parseJsonLoose(lastRaw);

      // Fast-path: el modelo quiere saltar este item
      if (parsed.title === 'SKIP') return null;

      const val = validateArticle(parsed);
      if (val.ok) return parsed;
      errors = val.errors;
      console.warn(`[llm] Intento ${attempt} fallo validacion:`, errors);
    } catch (err) {
      errors = [`No se pudo parsear JSON: ${(err as Error).message}`];
      console.warn(`[llm] Intento ${attempt} error:`, err);
    }
  }

  throw new Error(
    `LLM no produjo articulo valido tras ${MAX_RETRIES} intentos. Ultimos errores: ${errors.join('; ')}\nUltimo raw:\n${lastRaw.slice(0, 500)}`,
  );
}

export function getModelName(): string {
  return MODEL;
}
