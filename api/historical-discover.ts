import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  fetchHistoricalEntities,
  fetchHistoricalCategories,
  fetchHistoricalPages,
  fetchHistoricalDomains,
  fetchCategoriesList,
} from '../src/sources/discoversnoop.js';

/**
 * Returns DiscoverSnoop historical aggregates for a date range.
 *
 * Query params:
 *   from   YYYY-MM-DD  (required)
 *   to     YYYY-MM-DD  (required)
 *   lines  (optional, default 500, max 10000)
 *
 * Response:
 *   { from, to, entities, categories, pages, domains }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const from = typeof req.query.from === 'string' ? req.query.from : '';
    const to = typeof req.query.to === 'string' ? req.query.to : '';
    const linesParam = typeof req.query.lines === 'string' ? parseInt(req.query.lines, 10) : 500;

    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(from) || !dateRe.test(to)) {
      res.status(400).json({ error: 'from and to are required as YYYY-MM-DD' });
      return;
    }

    if (from > to) {
      res.status(400).json({ error: 'from must be <= to' });
      return;
    }

    const lines = Math.min(Math.max(50, linesParam), 10_000);

    const [entities, categories, pages, domains, categoryList] = await Promise.allSettled([
      fetchHistoricalEntities({ from_date: from, to_date: to, lines }),
      fetchHistoricalCategories({ from_date: from, to_date: to, lines }),
      fetchHistoricalPages({ from_date: from, to_date: to, lines: Math.min(lines, 1000) }),
      fetchHistoricalDomains({ from_date: from, to_date: to, lines: Math.min(lines, 500) }),
      fetchCategoriesList(),
    ]);

    const errors: Record<string, string> = {};
    if (entities.status === 'rejected') errors.entities = String(entities.reason);
    if (categories.status === 'rejected') errors.categories = String(categories.reason);
    if (pages.status === 'rejected') errors.pages = String(pages.reason);
    if (domains.status === 'rejected') errors.domains = String(domains.reason);

    // Resolve category ID -> name
    const catNameMap: Record<number, string> = {};
    if (categoryList.status === 'fulfilled') {
      for (const c of categoryList.value as any[]) {
        if (c?.id != null && c?.name) catNameMap[c.id] = c.name;
      }
    }

    const catData = categories.status === 'fulfilled' ? categories.value : [];
    const catWithNames = catData.map((c: any) => ({
      ...c,
      name: catNameMap[c.id] || `Category ${c.id}`,
    }));

    res.setHeader('Cache-Control', 's-maxage=300'); // 5 min cache
    res.json({
      from,
      to,
      entities: entities.status === 'fulfilled' ? entities.value : [],
      categories: catWithNames,
      pages: pages.status === 'fulfilled' ? pages.value : [],
      domains: domains.status === 'fulfilled' ? domains.value : [],
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
