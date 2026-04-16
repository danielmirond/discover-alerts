import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fetchGoogleTrends } from './sources/google-trends.js';
import { fetchXTrends } from './sources/x-trends.js';
import {
  fetchHistoricalEntities,
  fetchHistoricalCategories,
  fetchHistoricalPages,
  fetchHistoricalDomains,
  fetchCategoriesList,
} from './sources/discoversnoop.js';
import { loadState } from './state/store.js';
import { buildLiveView } from './analysis/live-view.js';
import type { MediaFeed } from './types.js';

const PORT = 3333;
const HTML_PATH = new URL('../public/index.html', import.meta.url).pathname;
const FEEDS_PATH = new URL('../feeds.json', import.meta.url).pathname;
const ROUTING_PATH = new URL('../routing.json', import.meta.url).pathname;

async function loadFeeds(): Promise<MediaFeed[]> {
  try {
    const raw = await readFile(FEEDS_PATH, 'utf-8');
    return JSON.parse(raw).feeds;
  } catch {
    return [];
  }
}

async function loadRouting(): Promise<any[]> {
  try {
    const raw = await readFile(ROUTING_PATH, 'utf-8');
    return JSON.parse(raw).routes || [];
  } catch {
    return [];
  }
}

async function handleApi(path: string): Promise<object> {
  if (path === '/api/trends') {
    const trends = await fetchGoogleTrends();
    return { trends };
  }
  if (path === '/api/x-trends') {
    const trends = await fetchXTrends();
    return { trends };
  }
  if (path === '/api/live-alerts') {
    await loadState();
    return await buildLiveView();
  }
  if (path.startsWith('/api/historical-discover')) {
    const url = new URL('http://x' + path);
    const from = url.searchParams.get('from') || '';
    const to = url.searchParams.get('to') || '';
    const lines = parseInt(url.searchParams.get('lines') || '500', 10);
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(from) || !dateRe.test(to)) {
      return { error: 'from and to are required as YYYY-MM-DD' };
    }
    const [ents, cats, pgs, doms, catList] = await Promise.allSettled([
      fetchHistoricalEntities({ from_date: from, to_date: to, lines }),
      fetchHistoricalCategories({ from_date: from, to_date: to, lines }),
      fetchHistoricalPages({ from_date: from, to_date: to, lines: Math.min(lines, 1000) }),
      fetchHistoricalDomains({ from_date: from, to_date: to, lines: Math.min(lines, 500) }),
      fetchCategoriesList(),
    ]);
    const catNameMap: Record<number, string> = {};
    if (catList.status === 'fulfilled') {
      for (const c of catList.value as any[]) {
        if (c?.id != null && c?.name) catNameMap[c.id] = c.name;
      }
    }
    const catData = cats.status === 'fulfilled' ? cats.value : [];
    return {
      from,
      to,
      entities: ents.status === 'fulfilled' ? ents.value : [],
      categories: catData.map((c: any) => ({ ...c, name: catNameMap[c.id] || `Category ${c.id}` })),
      pages: pgs.status === 'fulfilled' ? pgs.value : [],
      domains: doms.status === 'fulfilled' ? doms.value : [],
    };
  }
  if (path.startsWith('/api/weekly-history')) {
    await loadState();
    const state = (await import('./state/store.js')).getState();
    const history = state.weeklyHistory || {};
    const availableWeeks = Object.keys(history).sort().reverse();
    const url = new URL('http://x' + path);
    const week = url.searchParams.get('week') || availableWeeks[0];
    return {
      week: week || null,
      feeds: week ? (history[week] || {}) : {},
      availableWeeks,
    };
  }
  if (path === '/api/feeds') {
    const feeds = await loadFeeds();
    return { feeds };
  }
  if (path === '/api/routing') {
    const routes = await loadRouting();
    return { routes };
  }
  return { error: 'not found' };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  if (url.pathname.startsWith('/api/')) {
    try {
      const data = await handleApi(url.pathname);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  try {
    const html = await readFile(HTML_PATH, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch (err: any) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Error loading dashboard: ' + err.message);
  }
});

server.listen(PORT, () => {
  console.log(`Dashboard running at http://localhost:${PORT}`);
});
