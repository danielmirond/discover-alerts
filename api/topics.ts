import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Expone el contenido de topics.json para que el dashboard muestre qué
 * topics están activos y sus keywords sin tocar el estado de Upstash.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const path = join(process.cwd(), process.env.TOPICS_PATH || 'topics.json');
    const raw = await readFile(path, 'utf-8');
    const parsed = JSON.parse(raw);
    res.setHeader('Cache-Control', 's-maxage=60');
    res.json({
      topics: (parsed.topics || []).map((t: any) => ({
        id: t.id,
        label: t.label,
        minKeywords: t.minKeywords ?? 1,
        keywords: t.keywords || [],
        excludeKeywords: t.excludeKeywords || [],
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
