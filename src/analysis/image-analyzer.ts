import Anthropic from '@anthropic-ai/sdk';

/**
 * Analiza una imagen con Claude Haiku Vision y devuelve caption + match
 * score contra una entidad/titular. Cacheable por URL.
 *
 * Prompt diseñado para:
 *  - 1 frase descriptiva (caption)
 *  - score 0-10 de match entidad↔imagen
 *  - notas cortas (ej. "stock photo", "archivo", "sospechoso")
 *  - bandera brand_safety
 *
 * Coste aprox: ~$0.00025 por imagen (Haiku Vision). 1k imágenes = $0.25.
 */

export interface ImageAnalysis {
  imageUrl: string;
  caption: string;
  entityMatch: number; // 0-10
  notes: string[];
  brandSafe: boolean;
  analyzedAt: string;
  model: string;
  error?: string;
}

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (client) return client;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  client = new Anthropic({ apiKey: key });
  return client;
}

/**
 * Descarga la imagen y la pasa a Claude como base64. Claude soporta URLs
 * directas pero base64 es más robusto para CDNs con hotlink protection.
 */
async function fetchImageAsBase64(url: string): Promise<{ data: string; mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' } | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    const r = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 discover-alerts-image-analyzer' },
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const ct = r.headers.get('content-type') || '';
    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
    if (ct.includes('png')) mediaType = 'image/png';
    else if (ct.includes('gif')) mediaType = 'image/gif';
    else if (ct.includes('webp')) mediaType = 'image/webp';
    const buf = Buffer.from(await r.arrayBuffer());
    // Claude Vision accepts up to 5MB images; downscale if bigger
    if (buf.length > 5 * 1024 * 1024) return null;
    return { data: buf.toString('base64'), mediaType };
  } catch {
    return null;
  }
}

export async function analyzeImage(
  imageUrl: string,
  opts: { entityName?: string; headline?: string; model?: string } = {},
): Promise<ImageAnalysis> {
  const analyzedAt = new Date().toISOString();
  const model = opts.model || 'claude-haiku-4-5';
  const base: ImageAnalysis = {
    imageUrl, caption: '', entityMatch: 0, notes: [], brandSafe: true, analyzedAt, model,
  };

  const c = getClient();
  if (!c) return { ...base, error: 'ANTHROPIC_API_KEY missing' };

  const img = await fetchImageAsBase64(imageUrl);
  if (!img) return { ...base, error: 'image fetch failed' };

  const ctx = [
    opts.entityName ? `Entidad: "${opts.entityName}"` : null,
    opts.headline ? `Titular: "${opts.headline}"` : null,
  ].filter(Boolean).join('\n');

  const prompt = `Analiza esta imagen de un artículo de Google Discover (España).

${ctx || '(sin contexto adicional)'}

Devuelve JSON estricto (solo JSON, sin markdown ni prefijo):
{
  "caption": "1 frase describiendo lo que se ve",
  "entityMatch": 0-10,
  "notes": ["nota corta 1", "nota corta 2"],
  "brandSafe": true/false
}

Criterios:
- caption: español, máximo 20 palabras, objetiva (no adjetivos).
- entityMatch: ${opts.entityName ? `0-10, qué tanto la imagen refuerza/corresponde a la entidad "${opts.entityName}". 10 = foto directa de la entidad. 5 = relacionada pero genérica. 0 = no tiene que ver.` : 'poner 5 (no hay entidad para comparar)'}.
- notes: 1-3 observaciones relevantes. Ejemplos válidos: "foto de archivo", "stock photo", "imagen de agencia EFE", "collage", "infografía", "portada revista", "no muestra a la persona", "foto antigua", "imagen generada IA", "logo corporativo".
- brandSafe: false si muestra violencia explícita, contenido sexual, símbolos extremistas, drogas. true en caso contrario.`;

  try {
    const resp = await c.messages.create({
      model,
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.data } },
          { type: 'text', text: prompt },
        ],
      }],
    });
    const text = resp.content.map((b: any) => b.type === 'text' ? b.text : '').join('').trim();
    // Buscar primer { y último } (toleramos prefijo/sufijo)
    const i = text.indexOf('{'); const j = text.lastIndexOf('}');
    if (i < 0 || j < i) return { ...base, error: 'no json in response', caption: text.slice(0, 120) };
    const parsed = JSON.parse(text.slice(i, j + 1));
    return {
      ...base,
      caption: String(parsed.caption || '').slice(0, 400),
      entityMatch: Math.max(0, Math.min(10, Number(parsed.entityMatch ?? 0))),
      notes: Array.isArray(parsed.notes) ? parsed.notes.slice(0, 5).map((n: any) => String(n).slice(0, 80)) : [],
      brandSafe: parsed.brandSafe !== false,
    };
  } catch (err: any) {
    return { ...base, error: String(err.message || err).slice(0, 200) };
  }
}
