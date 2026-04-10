import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fetchGoogleTrends } from './sources/google-trends.js';
import type { MediaFeed } from './types.js';

const PORT = 3333;
const HTML_PATH = new URL('../public/index.html', import.meta.url).pathname;
const FEEDS_PATH = new URL('../feeds.json', import.meta.url).pathname;

async function loadFeeds(): Promise<MediaFeed[]> {
  try {
    const raw = await readFile(FEEDS_PATH, 'utf-8');
    return JSON.parse(raw).feeds;
  } catch {
    return [];
  }
}

async function handleApi(path: string): Promise<object> {
  if (path === '/api/trends') {
    const trends = await fetchGoogleTrends();
    return { trends };
  }
  if (path === '/api/feeds') {
    const feeds = await loadFeeds();
    return { feeds };
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
