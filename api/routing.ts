import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const raw = await readFile(join(process.cwd(), 'routing.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    res.setHeader('Cache-Control', 's-maxage=3600');
    res.json({ routes: parsed.routes || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
