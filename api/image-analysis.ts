import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';
import { analyzeImage } from '../src/analysis/image-analyzer.js';

/**
 * GET /api/image-analysis?url=<imageUrl>&entity=<name>&headline=<title>
 *
 * Lazy: solo analiza cuando el frontend lo pide. Cachea 7 días en Redis.
 * Ahorra llamadas a Claude (imágenes rara vez cambian de semántica).
 */

const CACHE_PREFIX = 'da:imgcache:';
const CACHE_TTL_SECONDS = 7 * 24 * 3600;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = String(req.query.url || '');
  const entity = req.query.entity ? String(req.query.entity) : undefined;
  const headline = req.query.headline ? String(req.query.headline) : undefined;
  const force = req.query.force === '1';

  if (!url || !/^https?:\/\//.test(url)) {
    res.status(400).json({ error: 'Falta url válida' });
    return;
  }

  const cacheKey = CACHE_PREFIX + hashFnv1a(`${url}|${entity || ''}`);
  const r = getRedis();

  if (r && !force) {
    try {
      const cached = await r.get<any>(cacheKey);
      if (cached) {
        res.setHeader('x-cache', 'HIT');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.json({ ...cached, cached: true });
        return;
      }
    } catch {}
  }

  const analysis = await analyzeImage(url, { entityName: entity, headline });

  if (r && !analysis.error) {
    try {
      await r.set(cacheKey, analysis, { ex: CACHE_TTL_SECONDS });
    } catch {}
  }

  res.setHeader('x-cache', 'MISS');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json({ ...analysis, cached: false });
}

/** FNV-1a 32-bit — enough for cache key distribution */
function hashFnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}
