import { updateState, saveState, loadState, getState } from '../state/store.js';
import { fetchHistoricalPages, fetchCategoriesList } from '../sources/discoversnoop.js';
import type { DiscoverPage } from '../types.js';

/**
 * Pull histórico DS para construir patrones por publisher con ventana 1 mes
 * (fallback 3 meses si 1 mes insuficiente).
 *
 * Cadencia recomendada: 1 vez al día (los datos cambian gradualmente).
 * Coste: 1 llamada DS con lines=10000 = ~5MB JSON.
 *
 * Persiste en state.publisherPatterns30d:
 *   { window: '30d' | '90d', lastUpdated, patterns: { domain → { displayName, articleCount, topNgrams } } }
 */

interface PublisherPatternsState {
  window: '30d' | '90d';
  lastUpdated: string;
  patterns: Record<string, { displayName: string; articleCount: number; topNgrams: Array<{ ngram: string; count: number }> }>;
}

const MEDIA_STOPWORDS = new Set(['el','la','los','las','un','una','de','en','y','o','que','es','por','con','para','como','se','su','sus','le','les','lo','mas','ya','no','si','del','al','este','esta','estos','estas','ese','esa','pero','sin','sobre','entre','hasta','desde','muy','todo','toda','todos','todas','asi','tras','solo','tan','tambien','aun','mientras','cuando','donde','quien','cual','segun','contra','hace','dice','tiene','dijo','tienen','dicen','va','van','ha','han','hay','sera','seran','fue','fueron','quot','apos','amp']);

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
}

function tokenize(s: string): string[] {
  return decodeEntities(s).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(w => w.length > 2 && !MEDIA_STOPWORDS.has(w));
}

function trigrams(words: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i <= words.length - 3; i++) out.push(words.slice(i, i + 3).join(' '));
  return out;
}

function rootDomain(input: string): string {
  let h = input.toLowerCase().replace(/^(www|amp|m|noticias)\./, '');
  const parts = h.split('.');
  if (parts.length >= 3 && !['co', 'com'].includes(parts[parts.length - 2])) {
    h = parts.slice(-2).join('.');
  }
  return h;
}

let categoryNamesCache: Record<number, string> | null = null;
async function getCategoryNames(): Promise<Record<number, string>> {
  if (categoryNamesCache) return categoryNamesCache;
  try {
    const list = await fetchCategoriesList();
    const map: Record<number, string> = {};
    for (const c of list as any[]) if (c?.id != null && c?.name) map[c.id] = c.name;
    categoryNamesCache = map;
    return map;
  } catch { return {}; }
}

async function fetchAndProcess(daysBack: number): Promise<{
  count: number;
  filtered: number;
  map: Map<string, { displayName: string; count: number; ngrams: Map<string, number> }>;
  byCategory: Map<string, { count: number; ngrams: Map<string, number> }>;
}> {
  const to = new Date();
  const from = new Date(Date.now() - daysBack * 24 * 3600_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  console.log(`[hist-patterns] DS /pages from=${fmt(from)} to=${fmt(to)} lines=10000`);
  const pages = await fetchHistoricalPages({ from_date: fmt(from), to_date: fmt(to), lines: 10000 });
  console.log(`[hist-patterns] got ${pages.length} pages`);

  // Filtro opcional por categoría DS (instancia sport: DS_CATEGORY_FILTER=/Sports)
  // Acepta también prefijos múltiples separados por coma (ej. '/Sports,/News/Sports')
  const dsFilter = process.env.DS_CATEGORY_FILTER;
  let filteredPages: DiscoverPage[] = pages;
  if (dsFilter) {
    const prefixes = dsFilter.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const names = await getCategoryNames();
    const matches = (c: string | number | undefined): boolean => {
      if (c == null) return false;
      const name = (typeof c === 'number' ? names[c] : c) || '';
      const lower = name.toLowerCase();
      return prefixes.some(p => lower.startsWith(p));
    };
    filteredPages = pages.filter(p => matches(p.category));
    console.log(`[hist-patterns] DS_CATEGORY_FILTER='${dsFilter}' → ${filteredPages.length}/${pages.length} pages`);
  }

  const names = await getCategoryNames();
  const map = new Map<string, { displayName: string; count: number; ngrams: Map<string, number> }>();
  const byCategory = new Map<string, { count: number; ngrams: Map<string, number> }>();
  for (const p of filteredPages) {
    if (!p.title) continue;
    const dom = rootDomain(p.domain || (p.url ? new URL(p.url).hostname : ''));
    if (!dom) continue;
    let row = map.get(dom);
    if (!row) {
      row = { displayName: p.publisher || dom, count: 0, ngrams: new Map() };
      map.set(dom, row);
    }
    row.count++;
    const tgs = trigrams(tokenize(p.title));
    for (const tg of tgs) row.ngrams.set(tg, (row.ngrams.get(tg) || 0) + 1);

    // Aggregate per DS category as well
    const catName = typeof p.category === 'number' ? names[p.category] : (p.category as string | undefined);
    if (catName) {
      let crow = byCategory.get(catName);
      if (!crow) { crow = { count: 0, ngrams: new Map() }; byCategory.set(catName, crow); }
      crow.count++;
      for (const tg of tgs) crow.ngrams.set(tg, (crow.ngrams.get(tg) || 0) + 1);
    }
  }
  return { count: pages.length, filtered: filteredPages.length, map, byCategory };
}

export async function runHistoricalPatternsPoll(): Promise<void> {
  await loadState();
  console.log('[hist-patterns] Starting...');

  // 30 días por defecto. Si data filtrada (post-DS_CATEGORY_FILTER) <1000, fallback 90d.
  let result = await fetchAndProcess(30);
  let window: '30d' | '90d' = '30d';
  if (result.filtered < 1000) {
    console.log(`[hist-patterns] 30d filtered=${result.filtered} insufficient, trying 90d...`);
    result = await fetchAndProcess(90);
    window = '90d';
  }

  const patterns: PublisherPatternsState['patterns'] = {};
  for (const [domain, row] of result.map) {
    if (row.count < 5) continue;
    const sorted = [...row.ngrams.entries()]
      .filter(([ng]) => ng.split(' ').every(t => t.length > 2 && !/^\d+$/.test(t)))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
    if (sorted.length === 0) continue;
    patterns[domain] = {
      displayName: row.displayName,
      articleCount: row.count,
      topNgrams: sorted.map(([ngram, count]) => ({ ngram, count })),
    };
  }

  const out: PublisherPatternsState = {
    window,
    lastUpdated: new Date().toISOString(),
    patterns,
  };
  console.log(`[hist-patterns] Persisted ${Object.keys(patterns).length} publishers (window=${window})`);

  // Persist by category too: top 12 ngrams per DS category
  const byCat: Record<string, { articleCount: number; topNgrams: Array<{ ngram: string; count: number }> }> = {};
  for (const [catName, row] of result.byCategory) {
    if (row.count < 5) continue;
    const sorted = [...row.ngrams.entries()]
      .filter(([ng]) => ng.split(' ').every(t => t.length > 2 && !/^\d+$/.test(t)))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
    if (sorted.length === 0) continue;
    byCat[catName] = {
      articleCount: row.count,
      topNgrams: sorted.map(([ngram, count]) => ({ ngram, count })),
    };
  }
  console.log(`[hist-patterns] Persisted ${Object.keys(byCat).length} categories`);

  updateState({
    publisherPatternsHistorical: out,
    categoryPatternsHistorical: { window, lastUpdated: out.lastUpdated, categories: byCat },
  } as any);
  try { await saveState(); } catch (err) { console.error('[hist-patterns] saveState:', err); }
  console.log('[hist-patterns] Poll complete');
}
