import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getState } from '../state/store.js';
import { loadTopicsDictionary, classifyText, pickBestTopic } from './topic-classifier.js';
import { computeVelocity, type VelocityMetrics } from './velocity.js';

// Read thresholds directly from env to avoid requiring DISCOVERSNOOP_TOKEN
// when the dashboard runs in read-only mode.
function envInt(key: string, fallback: number): number {
  const v = process.env[key];
  return v ? parseInt(v, 10) : fallback;
}
function envFloat(key: string, fallback: number): number {
  const v = process.env[key];
  return v ? parseFloat(v) : fallback;
}

const thresholds = {
  entityFlashWindowHours: envFloat('THRESHOLD_ENTITY_FLASH_WINDOW_HOURS', 1),
  entityLongtailWindowHours: envInt('THRESHOLD_ENTITY_LONGTAIL_WINDOW_HOURS', 2),
  entityAscendingWindowHours: envInt('THRESHOLD_ENTITY_ASCENDING_WINDOW_HOURS', 6),
  entityFlashMinAppearances: envInt('THRESHOLD_ENTITY_FLASH_MIN_APPEARANCES', 3),
  entityLongtailMinAppearances: envInt('THRESHOLD_ENTITY_LONGTAIL_MIN_APPEARANCES', 5),
  entityAscendingMinAppearances: envInt('THRESHOLD_ENTITY_ASCENDING_MIN_APPEARANCES', 3),
  trendCorrelationMin: envFloat('THRESHOLD_TREND_CORRELATION_MIN', 0.6),
  mediaMaxAgeHours: envInt('THRESHOLD_MEDIA_MAX_AGE_HOURS', 12),
};

interface LiveEntity {
  name: string;
  score: number;
  position: number;
  publications: number;
  category?: string;
  appearancesLastHour: number;
  appearancesLast2h: number;
  appearancesLast6h: number;
  status: 'flash' | 'longtail' | 'ascending' | 'normal';
  statuses: Array<'flash' | 'longtail' | 'ascending'>;
  matchingGoogleTrends: Array<{ title: string; approxTraffic: number }>;
  matchingXTrends: Array<{ topic: string; rank: number }>;
  matchingArticles: Array<{ title: string; link: string; feedName: string }>;
  velocity?: VelocityMetrics;
  /** Primera vez que DS vio esta entidad (desde EntitySnapshot.firstSeen) */
  firstSeen?: string;
  lastUpdated?: string;
}

interface LiveCategory {
  id: number;
  name: string;
  score: number;
  position: number;
  publications: number;
  score24hAgo: number | null;
  scoreDelta24h: number | null;
  historyPoints: number;
  examplePages: Array<{ title: string; url: string; publisher?: string }>;
  /** Top 10 páginas Discover con esta categoría, ordenadas por score, con imagen. */
  topPages?: Array<{
    url: string;
    title: string;
    image?: string;
    score: number;
    position?: number;
    domain?: string;
    firstSeen?: string;
    lastUpdated?: string;
  }>;
  /** Top entidades que DS mapea a esta categoría (vía state.entityCategoryMap). */
  topEntities?: Array<{
    name: string;
    score: number;
    position: number;
    publications: number;
    topic?: string;
  }>;
}

interface LiveConcordance {
  entityName: string;
  subtype: 'discover_trends_x' | 'discover_rss' | 'discover_trends' | 'discover_x';
  score: number;
  position: number;
  category?: string;
  matchingTrends: Array<{ title: string; approxTraffic: number }>;
  matchingXTrends: Array<{ topic: string; rank: number }>;
  matchingArticles: Array<{ title: string; link: string; feedName: string }>;
}

interface LiveHeadlinePattern {
  ngram: string;
  count: number;
  words: number;
}

interface LiveHeadlinePattern4d {
  ngram: string;
  totalCount: number;
  polls: number;
  words: number;
  firstSeen: string;
  lastSeen: string;
}

interface LiveRecentAlert {
  type: string;
  subtype?: string;
  title: string;
  detail: string;
  timestamp: string;
  routeName: string;
  category?: string; // DiscoverSnoop category (derived from pages)
  examples?: Array<{ title: string; url?: string; source?: string }>;
}

/**
 * Resumen de fórmulas aplicadas en los últimos N días, agrupado por regla
 * (matchKey). Sirve para ver "qué fórmulas funcionaron" proxy por volumen
 * de uso y audiencia media (entityScore DiscoverSnoop) de las entidades
 * que dispararon cada regla.
 */
interface LiveFormulaUsageStat {
  matchKey: string;
  count: number;
  avgEntityScore: number | null;
  maxEntityScore: number | null;
  uniqueEntities: number;
  topEntities: Array<{ name: string; count: number }>; // top 5
  firstSeen: string;
  lastSeen: string;
}

/**
 * Opportunity: huecos editoriales urgentes (activos AHORA mismo, no desde
 * el stream de alertas ya emitido/dedupado). Consolida:
 *   - hueco_seo: trends +10k sin match en Discover ni en nuestro RSS cache
 *   - not_covering: entidad con cobertura externa fuerte y nosotros sin publicar
 *   - triple_match_fresh: entidad en Discover+Trends+X con los thresholds
 *     endurecidos, con cobertura nuestra ausente (oportunidad de entrar)
 * Ordenado por `priorityScore` descendente.
 */
interface LiveOpportunity {
  kind: 'hueco_seo' | 'not_covering' | 'triple_match_fresh' | 'us_relevant';
  title: string;                 // entidad / topic principal
  detail: string;                // metrica de urgencia
  priorityScore: number;         // para ordenar el panel
  category?: string;
  topic?: string;                // sucesos/legal/...
  trafficEstimate?: number;      // trends approxTraffic
  outletCount?: number;          // otros medios cubriendo
  xRank?: number;
  discoverPosition?: number;
  otherOutlets?: string[];
  examples?: Array<{ title: string; url?: string; source?: string }>;
  /** Geo tag — solo presente en kind='us_relevant' para badgear 🇺🇸 en UI. */
  geo?: 'US';
  /** Por qué tiene cabida editorial (entity_es, media_es, topic_match). */
  cabidaReason?: Array<'entity_es' | 'media_es' | 'topic'>;
}

interface LiveTopMediaEntity {
  name: string;
  count: number;
  inGoogleTrends: boolean;
  inXTrends: boolean;
  inRss: boolean; // always true because it comes from RSS, but kept for symmetry
}

interface LiveTopMedia {
  /** Dominio raíz (publisher). Antes era feedName (cada RSS por separado);
   * unificado para que p.ej. todas las secciones de Mundo Deportivo cuenten
   * como un único publisher. Compat: mantenemos `feedName` con un label
   * legible (publisher.toUpperCase) para no romper el front antiguo. */
  feedName: string;
  /** Dominio canónico — clave de agrupación. */
  domain?: string;
  /** Lista de nombres de feeds RSS / sitemap que han contribuido a esta entrada. */
  sources?: string[];
  articleCount: number;
  entities: LiveTopMediaEntity[];
  topDiscoverPages?: Array<{
    url: string;
    title: string;
    image?: string;
    score: number;
    position?: number;
    lastUpdated?: string;
    firstSeen?: string;
  }>;
}

interface LiveViewResponse {
  lastPollDiscover: string | null;
  lastPollTrends: string | null;
  lastPollMedia: string | null;
  lastPollX: string | null;
  entities: LiveEntity[];
  categories: LiveCategory[];
  concordances: LiveConcordance[];
  opportunities: LiveOpportunity[];
  formulasLast30d: LiveFormulaUsageStat[];
  headlinePatterns: LiveHeadlinePattern[];
  headlinePatterns4d: LiveHeadlinePattern4d[];
  recentAlerts: LiveRecentAlert[];
  topMedia: LiveTopMedia[];
  instance?: { name: string; vertical: string | null };
  patternsByMedia?: Array<any>;
  patternsByMediaHistorical?: { window: string; lastUpdated: string; publishers: Array<any> } | null;
  patternsByCategoryHistorical?: { window: string; lastUpdated: string; categories: Array<any> } | null;
  entityKgEnrichment?: Record<string, any>;
  competitors?: Array<{
    name: string;
    domain: string;
    kind: 'sport' | 'general';
    pagesToday: number;
    pages48h: number;
    pagesHistorical: number;
    pagesHistoricalWindow: string;
    topCategories: Array<{ name: string; count: number }>;
    topPatterns: Array<{ ngram: string; count: number }>;
    samples: Array<{ url: string; title: string; image?: string; score: number; firstSeen?: string; category?: string }>;
  }>;
  cultural?: Array<any>;
  culturalEntityHits?: Array<any>;
  aemetEnriched?: Array<any>;
  schemaNews?: Record<string, Array<any>>;
  pagesSlim?: Array<any>;
  mediaArticlesSlim?: Array<any>;
  weeklyHistorySummary: {
    availableWeeks: string[];
    feedNames: string[];
  };
  totals: {
    entitiesTracked: number;
    categoriesTracked: number;
    googleTrendsCached: number;
    xTrendsCached: number;
    mediaArticlesCached: number;
  };
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Decodifica entities HTML numéricas (&#34;) y las named comunes. Usado en
 * fuentes como Menéame que publican titulares con HTML encoded. */
function decodeEntities(s: string | undefined | null): string {
  if (!s) return '';
  return String(s)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function diceCoefficient(a: string, b: string): number {
  const aN = normalize(a);
  const bN = normalize(b);
  if (aN === bN) return 1;
  if (aN.length < 2 || bN.length < 2) return 0;
  const bigramsA = new Set<string>();
  for (let i = 0; i < aN.length - 1; i++) bigramsA.add(aN.slice(i, i + 2));
  let intersection = 0;
  for (let i = 0; i < bN.length - 1; i++) {
    if (bigramsA.has(bN.slice(i, i + 2))) intersection++;
  }
  return (2 * intersection) / (bigramsA.size + (bN.length - 1));
}

export async function buildLiveView(): Promise<LiveViewResponse> {
  const state = getState();
  const nowMs = Date.now();
  const hour = 3600_000;

  const flashWindowMs = thresholds.entityFlashWindowHours * hour;
  const longtailWindowMs = thresholds.entityLongtailWindowHours * hour;
  const ascendingWindowMs = thresholds.entityAscendingWindowHours * hour;
  const flashMin = thresholds.entityFlashMinAppearances;
  const longtailMin = thresholds.entityLongtailMinAppearances;
  const ascendingMin = thresholds.entityAscendingMinAppearances;
  const fuzzy = thresholds.trendCorrelationMin;

  const countInWindow = (timestamps: string[], windowMs: number): number =>
    timestamps.filter(ts => nowMs - new Date(ts).getTime() <= windowMs).length;

  // Compute live entities with appearance breakdowns and statuses
  const entities: LiveEntity[] = [];
  for (const [name, snap] of Object.entries(state.entities)) {
    const apps = snap.appearances ?? [];
    const c1 = countInWindow(apps, flashWindowMs);
    const c2 = countInWindow(apps, longtailWindowMs);
    const c6 = countInWindow(apps, ascendingWindowMs);

    // An entity can have MULTIPLE statuses simultaneously
    const statuses: Array<'flash' | 'longtail' | 'ascending'> = [];
    if (c1 >= flashMin) statuses.push('flash');
    if (c2 >= longtailMin) statuses.push('longtail');
    if (c6 >= ascendingMin) statuses.push('ascending');

    // Si no pasa ningún threshold pero tiene buen score DS, marcamos 'normal'
    // y dejamos la entidad en la lista — así la tab "Entidades en vivo" siempre
    // tiene contenido (sobre todo tras un wipe o startup, cuando aún no hay
    // suficientes apariciones acumuladas para flash/longtail/ascending).
    const status: LiveEntity['status'] = statuses[0] || 'normal';

    // Compute enrichment matches
    const nameNorm = normalize(name);

    const matchingGoogleTrends: LiveEntity['matchingGoogleTrends'] = [];
    for (const [title, s] of Object.entries(state.trends)) {
      const tNorm = normalize(title);
      if (
        tNorm.includes(nameNorm) ||
        nameNorm.includes(tNorm) ||
        diceCoefficient(name, title) >= fuzzy
      ) {
        matchingGoogleTrends.push({ title, approxTraffic: s.approxTraffic });
      }
    }

    const matchingXTrends: LiveEntity['matchingXTrends'] = [];
    for (const [topic, s] of Object.entries(state.xTrends)) {
      const tNorm = normalize(topic.replace(/^#/, ''));
      if (tNorm.length < 3) continue;
      if (
        tNorm.includes(nameNorm) ||
        nameNorm.includes(tNorm) ||
        diceCoefficient(name, topic) >= fuzzy
      ) {
        matchingXTrends.push({ topic, rank: s.rank });
      }
    }

    const matchingArticles: LiveEntity['matchingArticles'] = [];
    for (const meta of Object.values(state.mediaArticles)) {
      if (!meta.title) continue;
      const titleNorm = normalize(meta.title);
      if (titleNorm.includes(nameNorm) && nameNorm.length > 3) {
        matchingArticles.push({
          title: meta.title,
          link: meta.link,
          feedName: meta.feedName,
        });
        if (matchingArticles.length >= 5) break;
      }
    }

    // Buscar en state.pages las top 5 páginas (por score) cuyo title mencione
    // la entidad y tengan imagen. Filtramos placeholders de X/Twitter y dominios
    // no-editoriales para evitar thumbs basura.
    const nameLower = name.toLowerCase();
    // No exigimos imagen para que cualquier entidad con menciones tenga noticias
    // visibles aunque la page DS no traiga foto.
    const pageCandidates: Array<{ url: string; title: string; image?: string; score: number }> = [];
    for (const [url, ps] of Object.entries(state.pages || {})) {
      if (!ps.title) continue;
      if (url.includes('x.com') || url.includes('twitter.com')) continue;
      if (ps.image && /placeholder/i.test(ps.image)) continue;
      if (ps.title.toLowerCase().includes(nameLower)) {
        pageCandidates.push({ url, title: ps.title, image: ps.image, score: ps.score || 0 });
      }
    }
    pageCandidates.sort((a, b) => b.score - a.score);
    const topPages = pageCandidates.slice(0, 5);
    const topPage = topPages.find(p => p.image) || topPages[0];

    entities.push({
      name,
      score: snap.score,
      position: snap.position,
      publications: snap.publications,
      category: state.entityCategoryMap[name],
      topic: state.entityTopicMap?.[name],
      appearancesLastHour: c1,
      appearancesLast2h: c2,
      appearancesLast6h: c6,
      status,
      statuses,
      matchingGoogleTrends: matchingGoogleTrends.slice(0, 3),
      matchingXTrends: matchingXTrends.slice(0, 3),
      matchingArticles,
      velocity: computeVelocity(apps, nowMs),
      firstSeen: (snap as any).firstSeen,
      lastUpdated: (snap as any).lastUpdated,
      imageUrl: topPage?.image,
      topPageTitle: topPage?.title,
      topPageUrl: topPage?.url,
      topPages: topPages.map(p => ({ url: p.url, title: p.title, image: p.image, score: p.score })),
    } as any);
  }

  // Sort by severity: flash > longtail > ascending, then by score
  const statusRank: Record<LiveEntity['status'], number> = {
    flash: 3, longtail: 2, ascending: 1, normal: 0,
  };
  entities.sort((a, b) => {
    const sr = statusRank[b.status] - statusRank[a.status];
    if (sr !== 0) return sr;
    return b.score - a.score;
  });

  // Indexar entities por categoría (via state.entityCategoryMap).
  // La key del map es el NOMBRE de la categoría (string), no el id.
  const entitiesByCatName = new Map<string, Array<{ name: string; score: number; position: number; publications: number; topic?: string }>>();
  for (const [name, snap] of Object.entries(state.entities || {})) {
    const catName = (state.entityCategoryMap || {})[name];
    if (!catName) continue;
    const key = catName.toLowerCase();
    if (!entitiesByCatName.has(key)) entitiesByCatName.set(key, []);
    entitiesByCatName.get(key)!.push({
      name,
      score: snap.score || 0,
      position: snap.position || 0,
      publications: snap.publications || 0,
      topic: (state.entityTopicMap || {})[name],
    });
  }

  // Indexar state.pages por categoría DS (soporta id numérico y name string).
  type CatPageItem = { url: string; title: string; image?: string; score: number; position?: number; domain?: string; firstSeen?: string; lastUpdated?: string };
  const pagesByCatId = new Map<number, CatPageItem[]>();
  const pagesByCatName = new Map<string, CatPageItem[]>();
  for (const [url, ps] of Object.entries(state.pages || {})) {
    if (!ps.title) continue;
    const item: CatPageItem = { url, title: ps.title, image: ps.image, score: ps.score || 0, position: ps.position, domain: ps.domain, firstSeen: (ps as any).firstSeen, lastUpdated: ps.lastUpdated };
    if (typeof ps.category === 'number') {
      if (!pagesByCatId.has(ps.category)) pagesByCatId.set(ps.category, []);
      pagesByCatId.get(ps.category)!.push(item);
    } else if (typeof ps.category === 'string' && ps.category) {
      const k = ps.category.toLowerCase();
      if (!pagesByCatName.has(k)) pagesByCatName.set(k, []);
      pagesByCatName.get(k)!.push(item);
    }
  }

  // Live categories with 24h delta + example URLs
  const categories: LiveCategory[] = [];
  for (const [idStr, snap] of Object.entries(state.categories)) {
    const history = snap.history ?? [];
    const oldest = history.length > 0 ? history[0] : null;
    const score24hAgo = oldest?.score ?? null;
    const delta = score24hAgo != null ? snap.score - score24hAgo : null;
    const id = Number(idStr);
    const examplePages = (state.categoryExamplePages[id] ?? []).slice(0, 5);

    // Top 10 pages de state.pages en esta categoría (por id o por nombre)
    const byId = pagesByCatId.get(id) || [];
    const byName = pagesByCatName.get((snap.name || '').toLowerCase()) || [];
    const combined = [...byId, ...byName];
    // Dedupe por URL
    const seen = new Set<string>();
    const dedup: typeof combined = [];
    for (const p of combined) {
      if (seen.has(p.url)) continue;
      seen.add(p.url);
      dedup.push(p);
    }
    dedup.sort((a, b) => b.score - a.score);
    const topPages = dedup.slice(0, 10);

    const catEnts = entitiesByCatName.get((snap.name || '').toLowerCase()) || [];
    const topEntities = [...catEnts].sort((a, b) => b.score - a.score).slice(0, 10);

    categories.push({
      id,
      name: snap.name,
      score: snap.score,
      position: snap.position,
      publications: snap.publications,
      score24hAgo,
      scoreDelta24h: delta,
      historyPoints: history.length,
      examplePages,
      topPages,
      topEntities,
    });
  }

  // Sort categories by absolute 24h delta descending
  categories.sort((a, b) => Math.abs(b.scoreDelta24h ?? 0) - Math.abs(a.scoreDelta24h ?? 0));

  // Compute cross-source concordances across all tracked entities
  const concordances: LiveConcordance[] = [];
  const entitiesByScore = Object.entries(state.entities)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 100);

  for (const [name, snap] of entitiesByScore) {
    const nameNorm = normalize(name);

    const matchingTrends: LiveConcordance['matchingTrends'] = [];
    for (const [title, s] of Object.entries(state.trends)) {
      const tNorm = normalize(title);
      if (
        tNorm.includes(nameNorm) ||
        nameNorm.includes(tNorm) ||
        diceCoefficient(name, title) >= fuzzy
      ) {
        matchingTrends.push({ title, approxTraffic: s.approxTraffic });
      }
    }

    const matchingXTrends: LiveConcordance['matchingXTrends'] = [];
    for (const [topic, s] of Object.entries(state.xTrends)) {
      const tNorm = normalize(topic.replace(/^#/, ''));
      if (tNorm.length < 3) continue;
      if (
        tNorm.includes(nameNorm) ||
        nameNorm.includes(tNorm) ||
        diceCoefficient(name, topic) >= fuzzy
      ) {
        matchingXTrends.push({ topic, rank: s.rank });
      }
    }

    const matchingArticles: LiveConcordance['matchingArticles'] = [];
    for (const meta of Object.values(state.mediaArticles)) {
      if (!meta.title) continue;
      const titleNorm = normalize(meta.title);
      if (titleNorm.includes(nameNorm) && nameNorm.length > 3) {
        matchingArticles.push({
          title: meta.title,
          link: meta.link,
          feedName: meta.feedName,
        });
        if (matchingArticles.length >= 5) break;
      }
    }

    const hasTrends = matchingTrends.length > 0;
    const hasX = matchingXTrends.length > 0;
    const hasRss = matchingArticles.length > 0;
    const sourceCount = (hasTrends ? 1 : 0) + (hasX ? 1 : 0) + (hasRss ? 1 : 0);

    let subtype: LiveConcordance['subtype'] | null = null;
    if (hasTrends && hasX) subtype = 'discover_trends_x';
    else if (hasRss && (hasTrends || hasX)) subtype = 'discover_rss';
    else if (hasTrends) subtype = 'discover_trends';
    else if (hasX) subtype = 'discover_x';
    else if (hasRss) subtype = 'discover_rss';

    if (!subtype) continue;
    if (sourceCount < 2 && !(hasRss && matchingArticles.length >= 3)) continue;

    concordances.push({
      entityName: name,
      subtype,
      score: snap.score,
      position: snap.position,
      category: state.entityCategoryMap[name],
      matchingTrends: matchingTrends.slice(0, 3),
      matchingXTrends: matchingXTrends.slice(0, 3),
      matchingArticles,
    });
  }

  // Sort: triple match first, then by score
  const concRank: Record<LiveConcordance['subtype'], number> = {
    discover_trends_x: 4, discover_rss: 3, discover_trends: 2, discover_x: 1,
  };
  concordances.sort((a, b) => {
    const r = concRank[b.subtype] - concRank[a.subtype];
    if (r !== 0) return r;
    return b.score - a.score;
  });

  // Recent alerts (flat view of what was sent to Slack)
  const recentAlerts: LiveRecentAlert[] = (state.recentAlerts ?? []).map(r => {
    const a = r.alert as any;
    let title = '';
    let detail = '';
    let examples: LiveRecentAlert['examples'];

    switch (a.type) {
      case 'entity':
        title = a.name;
        detail = `score=${a.score} | pos=#${a.position}${a.appearanceCount != null ? ` | ${a.appearanceCount} en ${a.windowHours}h` : ''}`;
        if (a.matchingArticles && a.matchingArticles.length > 0) {
          examples = a.matchingArticles.slice(0, 3).map((m: any) => ({
            title: m.title,
            url: m.link,
            source: m.feedName,
          }));
        }
        break;
      case 'entity_concordance':
        title = a.entityName;
        detail = `score=${a.score} | pos=#${a.position}`;
        if (a.matchingArticles && a.matchingArticles.length > 0) {
          examples = a.matchingArticles.slice(0, 3).map((m: any) => ({
            title: m.title,
            url: m.link,
            source: m.feedName,
          }));
        }
        break;
      case 'triple_match':
        title = a.entityName;
        detail = `score=${a.score} | pos=#${a.position} | ~${a.totalTrafficEstimate.toLocaleString()}+ | X#${a.bestXRank}`;
        if (a.matchingArticles && a.matchingArticles.length > 0) {
          examples = a.matchingArticles.slice(0, 3).map((m: any) => ({
            title: m.title,
            url: m.link,
            source: m.feedName,
          }));
        }
        break;
      case 'entity_coverage':
        title = a.entityName;
        detail = `${a.coverageCount} publicaciones en ${a.mediaOutlets.length} medios`;
        if (a.articles && a.articles.length > 0) {
          examples = a.articles.slice(0, 3).map((m: any) => ({
            title: m.title,
            url: m.link,
            source: m.feedName,
          }));
        }
        break;
      case 'category':
        title = a.name;
        detail = `score ${a.prevScore} → ${a.score}${a.windowHours ? ` (${a.windowHours}h)` : ''}`;
        if (a.examplePages && a.examplePages.length > 0) {
          examples = a.examplePages.slice(0, 3).map((p: any) => ({
            title: p.title,
            url: p.url,
            source: p.publisher,
          }));
        }
        break;
      case 'headline_pattern':
        title = `"${a.ngram}"`;
        detail = `${a.count} titulares`;
        if (a.matchingTitles && a.matchingTitles.length > 0) {
          examples = a.matchingTitles.slice(0, 3).map((t: string) => ({ title: t }));
        }
        break;
      case 'trends_correlation':
        title = a.trendTitle;
        detail = `${a.matchingEntities.length} entidades | trafico ~${a.approxTraffic}`;
        if (a.matchingPageTitles && a.matchingPageTitles.length > 0) {
          examples = a.matchingPageTitles.slice(0, 3).map((t: string) => ({ title: t }));
        }
        break;
      case 'trends_new_topic':
        title = a.title;
        detail = `nuevo trending | trafico ~${a.approxTraffic}`;
        if (a.newsItems && a.newsItems.length > 0) {
          examples = a.newsItems.slice(0, 3).map((n: any) => ({
            title: n.title,
            url: n.url,
            source: n.source,
          }));
        }
        break;
      case 'own_media':
        title = a.title;
        detail = `${a.ownDomain}${a.score != null ? ` | score=${a.score}` : ''}${a.trendTopic ? ` | Trends: "${a.trendTopic}"` : ''}${a.otherOutlets && a.otherOutlets.length > 0 ? ` | +${a.otherOutlets.length} medios` : ''}`;
        if (a.url) {
          examples = [{ title: a.title, url: a.url, source: a.ownDomain }];
        }
        if (a.otherOutlets && a.otherOutlets.length > 0) {
          examples = (examples || []).concat(
            a.otherOutlets.slice(0, 4).map((o: string) => ({ title: o }))
          );
        }
        break;
      case 'own_media_absent':
        title = a.entityName;
        detail = `Cubierto por ${a.otherOutlets.length} medios | Categoria: ${a.category || 'sin categoria'}`;
        if (a.otherTitles && a.otherTitles.length > 0) {
          examples = a.otherTitles.slice(0, 3).map((t: string) => ({ title: t }));
        }
        break;
      case 'trends_without_discover':
        title = a.trendTitle;
        detail = `~${a.approxTraffic.toLocaleString()}+ busquedas sin cobertura en Discover`;
        if (a.newsItems && a.newsItems.length > 0) {
          examples = a.newsItems.slice(0, 3).map((n: any) => ({
            title: n.title,
            url: n.url,
            source: n.source,
          }));
        }
        break;
      case 'headline_cluster':
        title = `${a.entitiesInCluster.length} entidades activas (cluster)`;
        detail = `Ventana: ${a.windowHours}h`;
        examples = a.entitiesInCluster.slice(0, 5).map((e: string) => ({ title: e }));
        break;
      case 'stale_data':
        title = `Pipeline inactivo: ${a.source}`;
        detail = `Sin actividad desde hace ${a.lastPollAgoMinutes} minutos`;
        break;
      case 'multi_entity_article':
        title = a.articleTitle;
        var scopeTag = a.feedScope === 'internacional' ? ' 🌍 INTERNACIONAL' : '';
        detail = `${a.entities.length} entidades: ${a.entities.slice(0, 5).join(', ')}${a.entities.length > 5 ? '...' : ''} | ${a.feedName}${scopeTag}`;
        examples = [{ title: a.articleTitle, url: a.articleLink, source: a.feedName }];
        break;
      case 'first_mover':
        title = a.entityName;
        detail = `Exclusiva de ${a.feedName} en los ultimos ${a.windowMinutes}min`;
        examples = [{ title: a.title, url: a.link, source: a.feedName }];
        break;
      case 'wikipedia_surge':
        title = decodeEntities(a.title);
        detail = `${a.editCount} edits de ${a.uniqueEditors} editores en ${a.windowMinutes}min${a.discoverAbsent ? ' (aun no en Discover)' : ''}`;
        examples = [{ title: decodeEntities(a.title), url: a.url, source: 'es.wikipedia.org' }];
        break;
      case 'meneame_hot':
        title = decodeEntities(a.title);
        detail = `karma ${a.karma} · votos ${a.votes} · ${a.comments} comentarios${a.discoverAbsent ? ' · aun no en Discover' : ''}`;
        examples = [
          { title: decodeEntities(a.title), url: a.storyUrl, source: 'meneame.net' },
          ...(a.externalUrl && a.externalUrl !== a.storyUrl ? [{ title: 'Fuente original', url: a.externalUrl }] : []),
        ];
        break;
      case 'schema_news_match':
        title = a.entityName || decodeEntities(a.articleTitle);
        detail = `${a.topic === 'sucesos' ? '🚨' : '⚖'} ${a.feedName}: ${decodeEntities(a.articleTitle)} · keywords: ${(a.keywords || []).slice(0, 3).join(', ')}${a.discoverScore != null ? ` · DS s${a.discoverScore}` : ''}`;
        examples = [{ title: decodeEntities(a.articleTitle), url: a.articleLink, source: a.feedName }];
        break;
    }
    // Derive category for filtering:
    // - entity/concordance/coverage alerts have their own derived category
    // - category-type alerts use their own name
    // - other types leave undefined
    let alertCategory: string | undefined;
    if (
      a.type === 'entity' ||
      a.type === 'entity_concordance' ||
      a.type === 'triple_match' ||
      a.type === 'entity_coverage' ||
      a.type === 'own_media' ||
      a.type === 'own_media_absent' ||
      a.type === 'multi_entity_article'
    ) {
      alertCategory = a.category;
    } else if (a.type === 'category') {
      alertCategory = a.name;
    }

    return {
      type: a.type,
      subtype: a.subtype,
      title,
      detail,
      timestamp: r.timestamp,
      routeName: r.routeName,
      category: alertCategory,
      examples,
    };
  });

  // === NOTICIAS CON SCHEMA SUCESOS/LEGAL ========================================
  // Escanea RSS articles + DS pages buscando keywords de topics.json.
  // NO son alertas sintéticas — son el listado crudo de noticias publicadas
  // que matchean el esquema editorial "sucesos"/"legal". Se muestran en el
  // Feed como listado separado.
  type SchemaMatchNews = {
    topic: string;
    title: string;
    url: string;
    source: string;
    kind: 'ds' | 'rss';
    timestamp: string;
    keywords: string[];
  };
  const schemaNews: Record<string, SchemaMatchNews[]> = {};
  try {
    const topicsDict2 = await loadTopicsDictionary();
    const scanTopics = topicsDict2.topics.filter(t => t.id === 'sucesos' || t.id === 'legal');
    if (scanTopics.length > 0) {
      type ScanItem = { title: string; url: string; source: string; kind: 'ds' | 'rss'; ts: number };
      const items: ScanItem[] = [];
      for (const [url, ps] of Object.entries(state.pages || {})) {
        if (!ps.title) continue;
        items.push({ title: ps.title, url, source: (ps.domain || '').replace(/^www\./, ''), kind: 'ds', ts: Date.parse(ps.lastUpdated || '') || Date.now() });
      }
      const maxAgeMs = 6 * 3600_000;
      const nowT = Date.now();
      for (const art of Object.values(state.mediaArticles || {})) {
        const ts = Date.parse((art as any).pubDate || (art as any).firstSeen || '') || 0;
        if (!ts || nowT - ts > maxAgeMs) continue;
        if (!art.title || !art.link) continue;
        items.push({ title: art.title, url: art.link, source: art.feedName || '', kind: 'rss', ts });
      }

      for (const topic of scanTopics) schemaNews[topic.id] = [];
      const seenUrlPerTopic = new Map<string, Set<string>>();
      for (const it of items) {
        const titleNorm = normalize(it.title);
        for (const topic of scanTopics) {
          const hits = (topic.keywords || []).filter(kw => titleNorm.includes(normalize(kw)));
          if (hits.length < (topic.minKeywords || 1)) continue;
          if (!seenUrlPerTopic.has(topic.id)) seenUrlPerTopic.set(topic.id, new Set());
          const seen = seenUrlPerTopic.get(topic.id)!;
          if (seen.has(it.url)) continue;
          seen.add(it.url);
          schemaNews[topic.id].push({
            topic: topic.id,
            title: it.title,
            url: it.url,
            source: it.source,
            kind: it.kind,
            timestamp: new Date(it.ts).toISOString(),
            keywords: hits.slice(0, 3),
          });
        }
      }
      for (const id of Object.keys(schemaNews)) {
        schemaNews[id].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        schemaNews[id] = schemaNews[id].slice(0, 80);
      }
      console.log(`[live-view] schema news: ${Object.entries(schemaNews).map(([k,v]) => `${k}=${v.length}`).join(' ')}`);
    }
  } catch (err) {
    console.warn('[live-view] schema scan failed:', (err as Error).message);
  }

  // Headline patterns (3+ words, 3+ occurrences)
  const headlinePatterns: LiveHeadlinePattern[] = Object.entries(state.headlinePatterns)
    .map(([ngram, count]) => ({ ngram, count, words: ngram.split(' ').length }))
    .filter(p => p.words >= 3 && p.count >= 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Headline patterns aggregated across the last 4 days from history
  const history4d = (state.headlinePatternsHistory ?? []);
  const aggMap = new Map<string, { totalCount: number; polls: number; first: string; last: string }>();
  for (const h of history4d) {
    const existing = aggMap.get(h.ngram);
    if (existing) {
      existing.totalCount += h.count;
      existing.polls += 1;
      if (h.timestamp < existing.first) existing.first = h.timestamp;
      if (h.timestamp > existing.last) existing.last = h.timestamp;
    } else {
      aggMap.set(h.ngram, {
        totalCount: h.count,
        polls: 1,
        first: h.timestamp,
        last: h.timestamp,
      });
    }
  }
  const headlinePatterns4d: LiveHeadlinePattern4d[] = Array.from(aggMap.entries())
    .map(([ngram, v]) => ({
      ngram,
      totalCount: v.totalCount,
      polls: v.polls,
      words: ngram.split(' ').length,
      firstSeen: v.first,
      lastSeen: v.last,
    }))
    .filter(p => p.words >= 3 && p.polls >= 2) // at least in 2 different polls
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 30);

  // Top 10 media: aggregate mediaArticles by feedName over the last 12h
  // (configurable via THRESHOLD_MEDIA_MAX_AGE_HOURS).
  // Uses pubDate when available, falling back to firstSeen.
  const topMediaMaxAgeMs = thresholds.mediaMaxAgeHours * 3600_000;
  const mediaArticlesArr = Object.values(state.mediaArticles).filter(a => {
    const pubTs = (a as any).pubDate ? new Date((a as any).pubDate).getTime() : NaN;
    const refTs = !isNaN(pubTs) ? pubTs : new Date(a.firstSeen).getTime();
    return (nowMs - refTs) <= topMediaMaxAgeMs;
  });
  // Antes: clave por feedName → cada RSS contaba aparte (MD Home, MD Futbol,
  // MD Real Madrid, … figuraban como 20 publishers distintos).
  // Ahora: clave por dominio raíz extraído del article.link → todas las
  // secciones de un publisher cuentan juntas (mundodeportivo.com).
  const perPublisher: Record<string, {
    domain: string;
    sources: Set<string>;
    articleCount: number;
    entityCounts: Map<string, number>;
  }> = {};

  function domainOf(link: string): string | null {
    try { return new URL(link).hostname.replace(/^www\./, '').toLowerCase(); } catch { return null; }
  }

  // Pre-normalize Discover entities for substring matching
  const normalizedEntities = Object.keys(state.entities).map(name => ({
    name,
    norm: normalize(name),
  })).filter(e => e.norm.length > 3);

  // Pre-compute sets of normalized Google Trends + X Trends topics
  const gtNorms = Object.keys(state.trends).map(t => normalize(t));
  const xNorms = Object.keys(state.xTrends).map(t => normalize(t.replace(/^#/, ''))).filter(t => t.length > 2);

  for (const art of mediaArticlesArr) {
    if (!art.title || !art.link) continue;
    const dom = domainOf(art.link);
    if (!dom) continue;
    if (!perPublisher[dom]) {
      perPublisher[dom] = { domain: dom, sources: new Set(), articleCount: 0, entityCounts: new Map() };
    }
    const entry = perPublisher[dom];
    if (art.feedName) entry.sources.add(art.feedName);
    entry.articleCount++;

    const titleNorm = normalize(art.title);
    for (const e of normalizedEntities) {
      if (titleNorm.includes(e.norm)) {
        const cur = entry.entityCounts.get(e.name) ?? 0;
        entry.entityCounts.set(e.name, cur + 1);
      }
    }
  }

  // Top 10 páginas Discover por dominio (ventana rolling 48h, ordenadas por score).
  function topDiscoverPagesForDomain(dom: string): Array<{ url: string; title: string; image?: string; score: number; position?: number; lastUpdated?: string; firstSeen?: string }> {
    const candidates: Array<{ url: string; title: string; image?: string; score: number; position?: number; lastUpdated?: string; firstSeen?: string }> = [];
    for (const [url, ps] of Object.entries(state.pages || {})) {
      if (!ps.title) continue;
      let pdom = (ps.domain || '').toLowerCase().replace(/^www\./, '');
      if (!pdom) {
        try { pdom = new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch {}
      }
      if (pdom === dom || pdom.endsWith('.' + dom)) {
        candidates.push({ url, title: ps.title, image: ps.image, score: ps.score || 0, position: ps.position, lastUpdated: ps.lastUpdated, firstSeen: (ps as any).firstSeen });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, 10);
  }

  const topMedia: LiveTopMedia[] = Object.values(perPublisher)
    .map(info => {
      const entities: LiveTopMediaEntity[] = Array.from(info.entityCounts.entries())
        .map(([name, count]) => {
          const nameNorm = normalize(name);
          const inGoogleTrends = gtNorms.some(gt =>
            gt.includes(nameNorm) || nameNorm.includes(gt) || diceCoefficient(name, gt) >= fuzzy,
          );
          const inXTrends = xNorms.some(xt =>
            xt.includes(nameNorm) || nameNorm.includes(xt) || diceCoefficient(name, xt) >= fuzzy,
          );
          return { name, count, inGoogleTrends, inXTrends, inRss: true };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);
      return {
        // feedName ahora es el dominio (label de display); sources lista los RSS/sitemap
        // individuales que han contribuido (legible en el drawer/detalle).
        feedName: info.domain,
        domain: info.domain,
        sources: [...info.sources].sort(),
        articleCount: info.articleCount,
        entities,
        topDiscoverPages: topDiscoverPagesForDomain(info.domain),
      } as LiveTopMedia;
    })
    .sort((a, b) => b.articleCount - a.articleCount)
    .slice(0, 30);

  // === OPPORTUNITIES ("Huecos activos") =======================================
  // Computed directly from cached state, independent of the dedup window.
  // Surfaces what should be covered NOW, not what was alerted in the last 6h.
  const opportunities: LiveOpportunity[] = [];
  const topicsDict = await loadTopicsDictionary();

  // Read own-media config from env directly (live-view avoids requiring the
  // full config singleton so the dashboard can run without DS token).
  const ownDomainsCsv = process.env.OWN_MEDIA_DOMAINS || '';
  const ownDomains = ownDomainsCsv.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
  const absentMinOthers = envInt('OWN_MEDIA_ABSENT_MIN_OTHERS', 3);
  const absentCategoryFilter = (process.env.OWN_MEDIA_ABSENT_CATEGORY_FILTER || 'Sport').toLowerCase();
  const minTrafficGap = envInt('THRESHOLD_TRENDS_WITHOUT_DISCOVER_MIN_TRAFFIC', 10_000);
  const tmMaxPos = envInt('THRESHOLD_TRIPLE_MATCH_MAX_POS', 50);
  const tmMinTraffic = envInt('THRESHOLD_TRIPLE_MATCH_MIN_TRAFFIC', 2000);
  const tmMaxXRank = envInt('THRESHOLD_TRIPLE_MATCH_MAX_X_RANK', 30);

  function extractDomain(url: string): string {
    try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
  }
  function matchesOwnDomain(domain: string): string | null {
    for (const own of ownDomains) {
      if (domain === own || domain.endsWith('.' + own)) return own;
    }
    return null;
  }

  const mediaMaxAgeMs = thresholds.mediaMaxAgeHours * 3600_000;

  // 1) HUECO SEO: Trends con >minTrafficGap búsquedas sin match en entidades ni páginas
  const entityNormsAll = Object.keys(state.entities).map(normalize).filter(s => s.length >= 3);
  const pageTitleNormsAll = Object.values(state.pages).map(p => normalize(p.title || ''));
  for (const [title, snap] of Object.entries(state.trends)) {
    if (snap.approxTraffic < minTrafficGap) continue;
    const tNorm = normalize(title);
    if (tNorm.length < 3) continue;
    const inEntities = entityNormsAll.some(en => en.includes(tNorm) || tNorm.includes(en));
    if (inEntities) continue;
    const inPages = pageTitleNormsAll.some(pt => pt.includes(tNorm));
    if (inPages) continue;

    const topicHits = classifyText(tNorm, topicsDict);
    const topic = pickBestTopic(topicHits, topicsDict);
    opportunities.push({
      kind: 'hueco_seo',
      title,
      detail: `~${snap.approxTraffic.toLocaleString()}+ busquedas sin cobertura en Discover`,
      priorityScore: snap.approxTraffic + 50_000, // baseline boost for pure hole
      topic,
      trafficEstimate: snap.approxTraffic,
    });
  }

  // 2) NO CUBRIMOS: entidades con cobertura de competencia >= absentMinOthers
  //    y nuestro dominio ausente. Solo si tenemos ownDomains configurados.
  if (ownDomains.length > 0) {
    const entityList = Object.keys(state.entities).filter(n => n.length > 3);
    for (const entityName of entityList) {
      const cat = state.entityCategoryMap[entityName];
      if (absentCategoryFilter && (!cat || !cat.toLowerCase().includes(absentCategoryFilter))) continue;

      const entityNorm = normalize(entityName);
      const otherOutlets = new Set<string>();
      const otherTitles: Array<{ title: string; url?: string; source?: string }> = [];
      let ownPresent = false;
      let maxTrafficMatch = 0;
      let bestXRankForEnt = Infinity;

      for (const meta of Object.values(state.mediaArticles)) {
        if (!meta.title) continue;
        const pubTs = (meta as any).pubDate ? new Date((meta as any).pubDate).getTime() : NaN;
        const refTs = !isNaN(pubTs) ? pubTs : new Date(meta.firstSeen).getTime();
        if (nowMs - refTs > mediaMaxAgeMs) continue;
        const titleNorm = normalize(meta.title);
        if (!titleNorm.includes(entityNorm)) continue;

        const articleDomain = extractDomain(meta.link);
        if (matchesOwnDomain(articleDomain)) { ownPresent = true; break; }
        otherOutlets.add(meta.feedName);
        if (otherTitles.length < 3) {
          otherTitles.push({ title: meta.title, url: meta.link, source: meta.feedName });
        }
      }
      if (ownPresent) continue;
      if (otherOutlets.size < absentMinOthers) continue;

      // Enrichment: cross-source to amplify priority
      for (const [trendTitle, snap] of Object.entries(state.trends)) {
        const tNorm = normalize(trendTitle);
        if (tNorm.includes(entityNorm) || entityNorm.includes(tNorm)) {
          maxTrafficMatch = Math.max(maxTrafficMatch, snap.approxTraffic);
        }
      }
      for (const [topic, snap] of Object.entries(state.xTrends)) {
        const tNorm = normalize(topic.replace(/^#/, ''));
        if (tNorm.length < 3) continue;
        if (tNorm.includes(entityNorm) || entityNorm.includes(tNorm)) {
          bestXRankForEnt = Math.min(bestXRankForEnt, snap.rank);
        }
      }

      const topic = state.entityTopicMap?.[entityName];
      const base = otherOutlets.size * 3000;
      const xBoost = bestXRankForEnt <= 30 ? (31 - bestXRankForEnt) * 500 : 0;
      const opp: LiveOpportunity = {
        kind: 'not_covering',
        title: entityName,
        detail: `${otherOutlets.size} medios cubren, nosotros no`,
        priorityScore: base + maxTrafficMatch + xBoost,
        category: cat,
        topic,
        outletCount: otherOutlets.size,
        otherOutlets: Array.from(otherOutlets).slice(0, 8),
        trafficEstimate: maxTrafficMatch || undefined,
        xRank: bestXRankForEnt !== Infinity ? bestXRankForEnt : undefined,
        examples: otherTitles,
      };
      opportunities.push(opp);
    }
  }

  // 3) TRIPLE MATCH FRESCO: entidad con Discover+Trends+X y thresholds
  //    endurecidos. Se añade incluso si nuestro dominio SI cubre (es tema caliente
  //    igual) pero priorityScore es menor cuando propio presente.
  const entitiesSortedByScore = Object.entries(state.entities)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 100);

  for (const [name, snap] of entitiesSortedByScore) {
    if (snap.position > tmMaxPos) continue;
    const nameNorm = normalize(name);

    let totalTraffic = 0;
    const matchedTrends: string[] = [];
    for (const [title, s] of Object.entries(state.trends)) {
      const tNorm = normalize(title);
      if (tNorm.includes(nameNorm) || nameNorm.includes(tNorm) || diceCoefficient(name, title) >= fuzzy) {
        totalTraffic += s.approxTraffic || 0;
        matchedTrends.push(title);
      }
    }
    if (totalTraffic < tmMinTraffic) continue;

    let bestXRank = Infinity;
    for (const [topic, s] of Object.entries(state.xTrends)) {
      const tNorm = normalize(topic.replace(/^#/, ''));
      if (tNorm.length < 3) continue;
      if (tNorm.includes(nameNorm) || nameNorm.includes(tNorm) || diceCoefficient(name, topic) >= fuzzy) {
        if (s.rank < bestXRank) bestXRank = s.rank;
      }
    }
    if (bestXRank > tmMaxXRank) continue;

    // Own domain presence for scoring (absent = higher priority)
    let ownPresent = false;
    const outletsCoveringEntity = new Set<string>();
    const sampleExamples: Array<{ title: string; url?: string; source?: string }> = [];
    for (const meta of Object.values(state.mediaArticles)) {
      if (!meta.title) continue;
      const pubTs = (meta as any).pubDate ? new Date((meta as any).pubDate).getTime() : NaN;
      const refTs = !isNaN(pubTs) ? pubTs : new Date(meta.firstSeen).getTime();
      if (nowMs - refTs > mediaMaxAgeMs) continue;
      const titleNorm = normalize(meta.title);
      if (!titleNorm.includes(nameNorm)) continue;
      const dom = extractDomain(meta.link);
      if (matchesOwnDomain(dom)) ownPresent = true;
      outletsCoveringEntity.add(meta.feedName);
      if (sampleExamples.length < 3) {
        sampleExamples.push({ title: meta.title, url: meta.link, source: meta.feedName });
      }
    }

    const topic = state.entityTopicMap?.[name];
    const base = 30_000 + totalTraffic + (31 - bestXRank) * 1000;
    const priorityScore = ownPresent ? Math.round(base * 0.4) : base;
    opportunities.push({
      kind: 'triple_match_fresh',
      title: name,
      detail: ownPresent
        ? `Tema caliente (nuestro medio YA cubre)`
        : `Discover#${snap.position} + Trends ~${totalTraffic.toLocaleString()}+ + X#${bestXRank}`,
      priorityScore,
      category: state.entityCategoryMap[name],
      topic,
      trafficEstimate: totalTraffic,
      xRank: bestXRank,
      discoverPosition: snap.position,
      outletCount: outletsCoveringEntity.size,
      examples: sampleExamples,
    });
  }

  // 4) US RELEVANT: trends US con cabida editorial en Espana.
  // Solo se anade si al menos UNA de estas senales es cierta:
  //   a) coincide con una entidad Discover ES cacheada (substring)
  //   b) coincide con un titular de medio ES en las ultimas 12h
  //   c) clasifica como un topic del diccionario (sucesos/legal/...)
  // Evita trends US puramente locales (deportes NFL, Taylor Swift gira, etc.)
  // que no tienen angulo espanol.
  const minUSTraffic = envInt('THRESHOLD_US_RELEVANT_MIN_TRAFFIC', 50_000);
  const trendsUS = state.trendsUS || {};
  for (const [title, snap] of Object.entries(trendsUS)) {
    if (snap.approxTraffic < minUSTraffic) continue;
    const tNorm = normalize(title);
    if (tNorm.length < 3) continue;

    // Signal A: entity Discover ES overlap
    let matchEntity: string | undefined;
    for (const entName of Object.keys(state.entities)) {
      const eNorm = normalize(entName);
      if (eNorm.length < 4) continue;
      if (tNorm.includes(eNorm) || eNorm.includes(tNorm)) { matchEntity = entName; break; }
    }
    // Signal B: ES media article title overlap (last 12h)
    let matchArticle: { title: string; url?: string; source?: string } | undefined;
    for (const meta of Object.values(state.mediaArticles)) {
      if (!meta.title) continue;
      const pubTs = (meta as any).pubDate ? new Date((meta as any).pubDate).getTime() : NaN;
      const refTs = !isNaN(pubTs) ? pubTs : new Date(meta.firstSeen).getTime();
      if (nowMs - refTs > mediaMaxAgeMs) continue;
      const mNorm = normalize(meta.title);
      if (mNorm.includes(tNorm)) {
        matchArticle = { title: meta.title, url: meta.link, source: meta.feedName };
        break;
      }
    }
    // Signal C: topic classifier
    const topicHits = classifyText(tNorm, topicsDict);
    const matchTopic = pickBestTopic(topicHits, topicsDict);
    // Also classify newsItems for richer signal
    if (!matchTopic && snap.newsItems) {
      for (const n of snap.newsItems) {
        const h = classifyText(normalize(n.title), topicsDict);
        const pt = pickBestTopic(h, topicsDict);
        if (pt) { /* if any news classifies, the trend has cabida via topic */
          (topicHits as any)[pt] = (topicHits[pt] || 0) + 1;
        }
      }
    }
    const finalTopic = matchTopic || pickBestTopic(topicHits, topicsDict);

    const cabidaReason: LiveOpportunity['cabidaReason'] = [];
    if (matchEntity) cabidaReason!.push('entity_es');
    if (matchArticle) cabidaReason!.push('media_es');
    if (finalTopic) cabidaReason!.push('topic');
    if (cabidaReason!.length === 0) continue; // pure US-local, no cabida

    // Detail text describes WHY it has cabida
    const reasonTxt: string[] = [];
    if (matchEntity) reasonTxt.push(`cruza con entidad ES "${matchEntity}"`);
    if (matchArticle) reasonTxt.push(`medio ES ya cubre`);
    if (finalTopic) reasonTxt.push(`topic ${finalTopic}`);
    const detail = `🇺🇸 ~${snap.approxTraffic.toLocaleString()}+ busquedas US — ${reasonTxt.join(' · ')}`;

    const examples: Array<{ title: string; url?: string; source?: string }> =
      (snap.newsItems || []).slice(0, 3).map(n => ({
        title: n.title, url: n.url, source: n.source,
      }));
    // If we matched an ES article, add it as an example too (precedencia al ES)
    if (matchArticle) examples.unshift(matchArticle);

    opportunities.push({
      kind: 'us_relevant',
      title,
      detail,
      // Priority: US signal + cabida boost. Entity+media+topic = very strong.
      priorityScore: Math.round(snap.approxTraffic * 0.2) + cabidaReason!.length * 5000,
      geo: 'US',
      topic: finalTopic,
      trafficEstimate: snap.approxTraffic,
      cabidaReason,
      examples: examples.slice(0, 4),
    });
  }

  // Dedup by title (prefer highest priorityScore) and sort
  const byTitle = new Map<string, LiveOpportunity>();
  for (const o of opportunities) {
    const key = `${o.kind}:${o.title}`;
    const prev = byTitle.get(key);
    if (!prev || o.priorityScore > prev.priorityScore) byTitle.set(key, o);
  }
  const opportunitiesSorted = Array.from(byTitle.values())
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 30);

  // === FORMULAS LAST 30 DAYS ===============================================
  // Agrupa state.formulaUsage[] por matchKey y calcula count, avg/max entity
  // score, top entities. Sirve para mostrar qué fórmulas se están usando más
  // y cuáles acompañan las entidades de mayor audiencia.
  const THIRTY_DAYS_MS = 30 * 24 * 3600_000;
  const cutoffMs = nowMs - THIRTY_DAYS_MS;
  const usage = (state.formulaUsage || []).filter(
    e => new Date(e.timestamp).getTime() >= cutoffMs,
  );
  const usageByKey = new Map<string, typeof usage>();
  for (const u of usage) {
    if (!usageByKey.has(u.matchKey)) usageByKey.set(u.matchKey, []);
    usageByKey.get(u.matchKey)!.push(u);
  }
  const formulasLast30d: LiveFormulaUsageStat[] = [];
  for (const [matchKey, rows] of usageByKey) {
    const scoreRows = rows.filter(r => typeof r.entityScore === 'number');
    const avgScore = scoreRows.length > 0
      ? scoreRows.reduce((a, r) => a + (r.entityScore as number), 0) / scoreRows.length
      : null;
    const maxScore = scoreRows.length > 0
      ? Math.max(...scoreRows.map(r => r.entityScore as number))
      : null;
    const entityCounts: Record<string, number> = {};
    for (const r of rows) {
      if (!r.entityName) continue;
      entityCounts[r.entityName] = (entityCounts[r.entityName] || 0) + 1;
    }
    const topEntities = Object.entries(entityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
    const timestamps = rows.map(r => r.timestamp).sort();
    formulasLast30d.push({
      matchKey,
      count: rows.length,
      avgEntityScore: avgScore !== null ? Number(avgScore.toFixed(1)) : null,
      maxEntityScore: maxScore !== null ? Number(maxScore.toFixed(1)) : null,
      uniqueEntities: Object.keys(entityCounts).length,
      topEntities,
      firstSeen: timestamps[0] || '',
      lastSeen: timestamps[timestamps.length - 1] || '',
    });
  }
  // Sort: highest avg score first (fallback to count)
  formulasLast30d.sort((a, b) => {
    const sa = a.avgEntityScore ?? -1;
    const sb = b.avgEntityScore ?? -1;
    if (sb !== sa) return sb - sa;
    return b.count - a.count;
  });

  // === CORRELACIÓN CULTURAL × DISCOVER ==========================================
  // Para cada item Netflix/FlixPatrol, marcar si el título matchea una entidad
  // en state.entities (normalizada + substring + dice >= 0.7). Tag en ambas
  // direcciones: cultural.inDiscover + entity.culturalHit.
  type CulturalItem = { source: 'netflix' | 'flixpatrol'; rank: number; title: string; category: string; seasonTitle?: string; cumulativeWeeks?: number; inDiscover?: boolean; discoverScore?: number };
  const stateAny = state as any;
  const culturalItems: CulturalItem[] = [];
  for (const n of (stateAny.netflixTop || [])) {
    culturalItems.push({ source: 'netflix', rank: n.rank, title: n.title, category: n.category, seasonTitle: n.seasonTitle, cumulativeWeeks: n.cumulativeWeeks });
  }
  for (const f of (stateAny.flixpatrolTop || [])) {
    culturalItems.push({ source: 'flixpatrol', rank: f.rank, title: f.title, category: f.category });
  }
  const entityNormMap = new Map<string, { name: string; score: number }>();
  for (const [name, snap] of Object.entries(state.entities || {})) {
    const n = normalize(name);
    // Requerir entidad de ≥4 chars para evitar falsos positivos como "OL"/"EU"
    // matcheando substrings aleatorios de títulos culturales.
    if (n.length < 4) continue;
    entityNormMap.set(n, { name, score: (snap as any).score || 0 });
  }
  // Mapa de entidades que han matcheado contenido cultural
  const culturalEntityHits = new Map<string, Array<{ source: 'netflix' | 'flixpatrol'; rank: number; title: string }>>();
  for (const ci of culturalItems) {
    const tNorm = normalize(ci.title);
    if (tNorm.length < 4) continue;
    let bestMatch: { entityName: string; score: number } | null = null;
    for (const [eNorm, info] of entityNormMap) {
      if (tNorm.includes(eNorm) || eNorm.includes(tNorm) || diceCoefficient(tNorm, eNorm) >= 0.7) {
        if (!bestMatch || info.score > bestMatch.score) bestMatch = { entityName: info.name, score: info.score };
      }
    }
    if (bestMatch) {
      ci.inDiscover = true;
      ci.discoverScore = bestMatch.score;
      if (!culturalEntityHits.has(bestMatch.entityName)) culturalEntityHits.set(bestMatch.entityName, []);
      culturalEntityHits.get(bestMatch.entityName)!.push({ source: ci.source, rank: ci.rank, title: ci.title });
    }
  }

  // === CORRELACIÓN AEMET × DISCOVER =============================================
  // Por cada aviso, contar páginas Discover cuyo título mencione:
  //   (a) la región, O
  //   (b) el fenómeno en español (lluvia, tormenta, granizo, nieve, viento, calor...)
  // Además: si nivel ≥ naranja y 0 matches → señal de "cobertura ausente".
  const aemetAvisos = (stateAny.aemetAvisos || []) as Array<{ level: string; severity: string; region: string; phenomenon: string; expires?: string; url?: string }>;
  const phenMap: Record<string, string[]> = {
    rain: ['lluvia', 'lluvias', 'precipita'],
    thunderstorm: ['tormenta', 'tormentas', 'granizo', 'rayo'],
    snow: ['nieve', 'nevada', 'nieva'],
    wind: ['viento', 'vendaval', 'rafaga'],
    coastal: ['temporal', 'oleaje', 'mar'],
    heat: ['calor', 'ola de calor'],
    cold: ['frio', 'heladas', 'hielo'],
    fog: ['niebla'],
    avalanche: ['alud', 'avalancha'],
  };
  function phenomenonKeywords(p: string): string[] {
    const k = (p || '').toLowerCase();
    for (const key of Object.keys(phenMap)) {
      if (k.includes(key)) return phenMap[key];
    }
    return [k];
  }
  const pageTitlesNorm: Array<{ url: string; title: string; titleNorm: string; score: number }> = [];
  for (const [url, ps] of Object.entries(state.pages || {})) {
    if (!ps.title) continue;
    pageTitlesNorm.push({ url, title: ps.title, titleNorm: normalize(ps.title), score: (ps as any).score || 0 });
  }
  const aemetEnriched = aemetAvisos.map(a => {
    const regionNorm = normalize(a.region || '');
    const keys = phenomenonKeywords(a.phenomenon).map(k => normalize(k));
    const matches: Array<{ url: string; title: string; score: number }> = [];
    for (const p of pageTitlesNorm) {
      const hitsRegion = regionNorm.length > 4 && p.titleNorm.includes(regionNorm);
      const hitsPhen = keys.some(k => k.length > 3 && p.titleNorm.includes(k));
      if (hitsRegion || hitsPhen) {
        matches.push({ url: p.url, title: p.title, score: p.score });
      }
    }
    matches.sort((a, b) => b.score - a.score);
    const coverageCount = matches.length;
    const isHighSeverity = a.level === 'naranja' || a.level === 'rojo';
    const coverageGap = isHighSeverity && coverageCount === 0;
    return { ...a, coverageCount, coverageGap, matchingPages: matches.slice(0, 3) };
  });

  return {
    instance: {
      name: process.env.INSTANCE_NAME || 'main',
      vertical: process.env.DS_CATEGORY_FILTER || null,
    },
    lastPollDiscover: state.lastPollDiscover,
    lastPollTrends: state.lastPollTrends,
    lastPollMedia: state.lastPollMedia,
    lastPollX: state.lastPollX,
    // === PATTERNS BY MEDIO (n-gramas más usados por cada cabecera) ===
    // Agrupa state.mediaArticles por feedName, normaliza títulos, extrae
    // 3-grams filtrando stopwords y devuelve top 5 patrones por medio.
    // Útil para ver qué fórmula editorial domina en Marca vs AS vs MD, etc.
    patternsByMedia: (() => {
      // Patrones de TITULARES QUE HAN ENTRADO EN DISCOVER (state.pages, rolling 48h),
      // agrupados por publisher (dominio raíz). Útil porque solo cuenta el contenido
      // que efectivamente Google Discover ha incluido — fórmulas que funcionan,
      // no lo que cada medio publica en general.
      // Mapping completo feedName → domain leyendo feeds.json directamente
      // (feedDomains solo cubre feeds activos en últimas 12h, perdíamos cobertura).
      const feedToPublisher = new Map<string, string>();
      try {
        const fpath = path.join(process.cwd(), process.env.FEEDS_PATH || 'feeds.json');
        const feedsRaw = readFileSync(fpath, 'utf-8');
        const parsed = JSON.parse(feedsRaw) as { feeds: Array<{ name: string; domain?: string }> };
        for (const f of (parsed.feeds || [])) {
          if (f.name && f.domain) {
            feedToPublisher.set(f.name, f.domain.replace(/^www\./, '').toLowerCase());
          }
        }
      } catch { /* noop */ }
      // Fallback: completar con feedDomains observado (de mediaArticles 12h)
      for (const [feedName, doms] of Object.entries(feedDomains || {})) {
        if (feedToPublisher.has(feedName)) continue;
        const arr = [...doms];
        if (arr.length === 0) continue;
        const cleaned = arr.map(d => d.replace(/^(www|amp|m|noticias)\./, ''));
        const nonCdn = cleaned.find(d => !/uecdn|cdn|cloudfront|akamai|edgesuite|fastly/i.test(d)) || cleaned[0];
        feedToPublisher.set(feedName, nonCdn);
      }
      const knownPublishers = ['Mundo Deportivo','Marca','As','Sport','El Mundo','El País','La Vanguardia','ABC','El Confidencial','El Español','OK Diario','OKdiario','20 Minutos','El Periódico','Antena 3','laSexta','Levante-EMV','Faro de Vigo','La Provincia','Diario de Mallorca','Cadena SER','COPE','Onda Cero','Europa Press','RTVE','Heraldo','eldiario.es','Huffington Post','Xataka','InfoLibre','Voz Pópuli','El Plural','El Independiente','Libertad Digital','Crónica Global','Diario de León','Confilegal','Lawyerpress','Legal Today'];
      const publisherInfo = new Map<string, { displayName: string; count: number; ngrams: Map<string, number>; subfeeds: Set<string> }>();
      // Tokenizer (mismo que weekly-aggregator)
      const mediaStopwords = new Set(['el','la','los','las','un','una','de','en','y','o','que','es','por','con','para','como','se','su','sus','le','les','lo','mas','ya','no','si','del','al','este','esta','estos','estas','ese','esa','pero','sin','sobre','entre','hasta','desde','muy','todo','toda','todos','todas','asi','tras','solo','tan','tambien','aun','mientras','cuando','donde','quien','cual','segun','contra','hace','dice','tiene','dijo','tienen','dicen','va','van','ha','han','hay','sera','seran','fue','fueron','quot','apos','amp']);
      const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !mediaStopwords.has(w));
      const trigrams = (words: string[]) => { const out: string[] = []; for (let i = 0; i <= words.length - 3; i++) out.push(words.slice(i, i + 3).join(' ')); return out; };

      // Iterar state.pages (DS pages, rolling 48h cap 2000).
      // Resolución de publisher: 1) page.domain (DS field), 2) hostname del URL.
      for (const [url, ps] of Object.entries(state.pages || {})) {
        if (!ps.title) continue;
        let dom = (ps.domain || '').toLowerCase().replace(/^www\./, '');
        if (!dom) {
          try { dom = new URL(url).hostname.toLowerCase().replace(/^(www|amp|m|noticias)\./, ''); } catch { continue; }
        }
        if (!dom) continue;
        // Reducir subdominios: cordopolis.eldiario.es → eldiario.es
        const parts = dom.split('.');
        if (parts.length >= 3 && !['co', 'com'].includes(parts[parts.length - 2])) {
          dom = parts.slice(-2).join('.');
        }
        let row = publisherInfo.get(dom);
        if (!row) {
          // Display: usar publisher de la page si DS lo ha incluido, sino feedName resolved, sino domain.
          let dn = dom;
          if (ps.publisher && ps.publisher.length < 60) {
            dn = ps.publisher;
          } else {
            // Buscar feedName que mapee a este dominio
            for (const [feedName, fdom] of feedToPublisher) {
              if (fdom === dom) {
                for (const known of knownPublishers) {
                  if (feedName.toLowerCase().startsWith(known.toLowerCase())) { dn = known; break; }
                }
                if (dn === dom) dn = feedName.replace(/ Sitemap News$| RSS$| Feed$/i, '').split(' ').slice(0, 4).join(' ');
                break;
              }
            }
          }
          row = { displayName: dn, count: 0, ngrams: new Map(), subfeeds: new Set() };
          publisherInfo.set(dom, row);
        }
        row.count++;
        // El title de DS pages a veces trae HTML entities también
        const cleanTitle = decodeEntities(ps.title);
        for (const tg of trigrams(norm(cleanTitle))) row.ngrams.set(tg, (row.ngrams.get(tg) || 0) + 1);
      }
      const out: Array<{ feedName: string; domain: string; subfeeds: number; articleCount: number; topPatterns: Array<{ ngram: string; count: number; share: number }> }> = [];
      // Filtros de calidad para limpiar ngramas basura:
      //  - Skip si tiene token solo numérico (ej. "039 scudetto 039" residual)
      //  - Skip si tiene token <=2 chars (residual de tokenization sucia)
      const isCleanNgram = (ng: string): boolean => {
        const tokens = ng.split(' ');
        for (const t of tokens) {
          if (t.length <= 2) return false;
          if (/^\d+$/.test(t)) return false;
        }
        return true;
      };
      // Dedupe coincidencias: si 2 ngramas comparten 2 tokens consecutivos
      // (ej. "milan directo serie" y "lazio directo serie"), conservar solo el
      // de mayor count. Conservamos el primer hit y pedimos a los siguientes
      // con bigrama compartido en el medio que cedan.
      const dedupeOverlap = (sorted: Array<[string, number]>): Array<[string, number]> => {
        const kept: Array<[string, number]> = [];
        const seenBigrams = new Set<string>();
        for (const [ngram, c] of sorted) {
          const tokens = ngram.split(' ');
          // bigrama central (token1 + token2): ej "directo serie" en "milan directo serie"
          const middleBigram = tokens.slice(1, 3).join(' ');
          if (seenBigrams.has(middleBigram)) continue;
          seenBigrams.add(middleBigram);
          kept.push([ngram, c]);
          if (kept.length >= 10) break;
        }
        return kept;
      };

      for (const [domain, row] of publisherInfo) {
        if (row.count < 2) continue;
        const minPatternCount = row.count >= 8 ? 2 : 1;
        const cleanSorted = [...row.ngrams.entries()]
          .filter(([ng, c]) => c >= minPatternCount && isCleanNgram(ng))
          .sort((a, b) => b[1] - a[1]);
        const deduped = dedupeOverlap(cleanSorted);
        const topPatterns = deduped.map(([ngram, c]) => ({ ngram, count: c, share: Math.round((c / row.count) * 100) }));
        if (topPatterns.length === 0 && row.count < 5) continue;
        out.push({ feedName: row.displayName, domain, subfeeds: row.subfeeds.size, articleCount: row.count, topPatterns });
      }
      return out.sort((a, b) => b.articleCount - a.articleCount).slice(0, 100);
    })(),

    // === COMPETIDORES (sport) ===========================================
    // Conjunto fijo de competidores deportivos. Para cada uno calculamos:
    //   - pagesToday: pages DS últimas 24h (state.pages firstSeen)
    //   - pages48h: pages DS últimas 48h (todo el state.pages)
    //   - pagesHistorical: pages DS en publisherPatternsHistorical (30d/90d)
    //   - topCategories: del state.pages
    //   - topPatterns: del histórico (más data = más señal)
    //   - samples: 3 titulares recientes con thumbnail
    competitors: (() => {
      const histRef: any = (state as any).publisherPatternsHistorical;
      // Lista adaptativa según instancia.
      // - Sport (DS_CATEGORY_FILTER=/Sports): cabeceras deportivas ES + LatAm
      // - Main (sin filter): generalistas españoles (los 10 más relevantes en
      //   competencia editorial Discover).
      // Override: COMPETITORS_DOMAINS env var con "name|domain,name|domain,..."
      const sportList: Array<{ name: string; domain: string; kind: 'sport' }> = [
        { name: 'AS', domain: 'as.com', kind: 'sport' },
        { name: 'MARCA', domain: 'marca.com', kind: 'sport' },
        { name: 'Mundo Deportivo', domain: 'mundodeportivo.com', kind: 'sport' },
        { name: 'SPORT.es', domain: 'sport.es', kind: 'sport' },
        { name: 'El Desmarque', domain: 'eldesmarque.com', kind: 'sport' },
        { name: 'Estadio Deportivo', domain: 'estadiodeportivo.com', kind: 'sport' },
        { name: 'Eurosport', domain: 'eurosport.es', kind: 'sport' },
        { name: 'TyC Sports', domain: 'tycsports.com', kind: 'sport' },
        { name: 'Superdeporte', domain: 'superdeporte.es', kind: 'sport' },
        { name: 'Defensa Central', domain: 'defensacentral.com', kind: 'sport' },
      ];
      const mainList: Array<{ name: string; domain: string; kind: 'general' }> = [
        // Top diarios nacionales
        { name: 'El País', domain: 'elpais.com', kind: 'general' },
        { name: 'El Mundo', domain: 'elmundo.es', kind: 'general' },
        { name: 'ABC', domain: 'abc.es', kind: 'general' },
        { name: 'La Vanguardia', domain: 'lavanguardia.com', kind: 'general' },
        { name: 'La Razón', domain: 'larazon.es', kind: 'general' },
        { name: 'El Español', domain: 'elespanol.com', kind: 'general' },
        // Digitales nativos
        { name: 'El Confidencial', domain: 'elconfidencial.com', kind: 'general' },
        { name: 'OK Diario', domain: 'okdiario.com', kind: 'general' },
        { name: '20 Minutos', domain: '20minutos.es', kind: 'general' },
        { name: 'eldiario.es', domain: 'eldiario.es', kind: 'general' },
        { name: 'Huffington Post', domain: 'huffingtonpost.es', kind: 'general' },
        { name: 'Voz Pópuli', domain: 'vozpopuli.com', kind: 'general' },
        { name: 'El Independiente', domain: 'elindependiente.com', kind: 'general' },
        { name: 'Libertad Digital', domain: 'libertaddigital.com', kind: 'general' },
        { name: 'El Plural', domain: 'elplural.com', kind: 'general' },
        { name: 'Crónica Global', domain: 'cronicaglobal.elespanol.com', kind: 'general' },
        // TV / Radio
        { name: 'RTVE', domain: 'rtve.es', kind: 'general' },
        { name: 'Antena 3', domain: 'antena3.com', kind: 'general' },
        { name: 'laSexta', domain: 'lasexta.com', kind: 'general' },
        { name: 'Cadena SER', domain: 'cadenaser.com', kind: 'general' },
        { name: 'COPE', domain: 'cope.es', kind: 'general' },
        { name: 'Onda Cero', domain: 'ondacero.es', kind: 'general' },
        // Regionales relevantes
        { name: 'El Periódico', domain: 'elperiodico.com', kind: 'general' },
      ];
      // Override opcional vía env var
      const override = (process.env.COMPETITORS_DOMAINS || '').trim();
      let list: Array<{ name: string; domain: string; kind: 'sport' | 'general' }>;
      if (override) {
        list = override.split(',').map(s => {
          const parts = s.split('|').map(x => (x || '').trim());
          if (parts.length < 2) return null;
          const [name, domain, kind] = parts;
          if (!name || !domain) return null;
          return { name, domain, kind: (kind === 'sport' ? 'sport' : 'general') };
        }).filter(Boolean) as Array<{ name: string; domain: string; kind: 'sport' | 'general' }>;
      } else if (process.env.DS_CATEGORY_FILTER) {
        // Sport: solo deportivos
        list = sportList;
      } else {
        // Main: deportivos + generalistas (cobertura completa)
        list = [...sportList, ...mainList];
      }
      const dayMs = Date.now() - 24 * 3600_000;
      const cnames = (() => {
        // Build category id → name desde state.categories (que SÍ tiene los names).
        const m: Record<number, string> = {};
        for (const [id, snap] of Object.entries(state.categories || {})) {
          const idNum = Number(id);
          if (!isNaN(idNum) && (snap as any).name) m[idNum] = (snap as any).name;
        }
        return m;
      })();
      const getCatName = (c: string | number | undefined): string | undefined => {
        if (c == null) return undefined;
        if (typeof c === 'number') return cnames[c] || `Cat ${c}`;
        return c;
      };
      const matchesDom = (host: string, target: string) => {
        const h = host.toLowerCase().replace(/^(www|amp|m|noticias)\./, '');
        return h === target || h.endsWith('.' + target);
      };
      return list.map(comp => {
        const matchedPages: Array<{ url: string; ps: any }> = [];
        for (const [url, ps] of Object.entries(state.pages || {})) {
          if (!ps.title) continue;
          let host = (ps.domain || '').toLowerCase().replace(/^www\./, '');
          if (!host) {
            try { host = new URL(url).hostname.toLowerCase().replace(/^(www|amp|m|noticias)\./, ''); } catch { continue; }
          }
          if (matchesDom(host, comp.domain)) matchedPages.push({ url, ps });
        }
        const pages48h = matchedPages.length;
        const pagesToday = matchedPages.filter(({ ps }) => {
          const ts = Date.parse((ps as any).firstSeen || ps.lastUpdated || '');
          return ts && ts >= dayMs;
        }).length;
        // Categorías por count
        const catCount = new Map<string, number>();
        for (const { ps } of matchedPages) {
          const cn = getCatName((ps as any).category);
          if (cn) catCount.set(cn, (catCount.get(cn) || 0) + 1);
        }
        const topCategories = [...catCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
        // Patrones desde histórico (si hay)
        let topPatterns: Array<{ ngram: string; count: number }> = [];
        let pagesHistorical = 0;
        let pagesHistoricalWindow = '';
        if (histRef && histRef.patterns && histRef.patterns[comp.domain]) {
          const h = histRef.patterns[comp.domain];
          pagesHistorical = h.articleCount || 0;
          pagesHistoricalWindow = histRef.window || '';
          topPatterns = (h.topNgrams || []).slice(0, 8);
        }
        // Samples (3 más recientes)
        const samples = [...matchedPages]
          .sort((a, b) => Date.parse((b.ps as any).firstSeen || b.ps.lastUpdated || '') - Date.parse((a.ps as any).firstSeen || a.ps.lastUpdated || ''))
          .slice(0, 3)
          .map(({ url, ps }) => ({
            url,
            title: ps.title || '',
            image: ps.image,
            score: ps.score || 0,
            firstSeen: (ps as any).firstSeen,
            category: getCatName((ps as any).category),
          }));
        return { name: comp.name, domain: comp.domain, kind: comp.kind, pagesToday, pages48h, pagesHistorical, pagesHistoricalWindow, topCategories, topPatterns, samples };
      });
    })(),

    // Patrones histórico por CATEGORÍA DS (precomputados igual que por publisher).
    patternsByCategoryHistorical: (() => {
      const hist = (state as any).categoryPatternsHistorical;
      if (!hist || !hist.categories) return null;
      const out: Array<{ category: string; articleCount: number; topPatterns: Array<{ ngram: string; count: number; share: number }>; topEntities: Array<{ name: string; count: number }>; topVerbs: Array<{ verb: string; count: number }> }> = [];
      for (const [name, row] of Object.entries(hist.categories as Record<string, any>)) {
        const top = (row.topNgrams || []).slice(0, 10);
        out.push({
          category: name,
          articleCount: row.articleCount || 0,
          topPatterns: top.map((p: any) => ({ ngram: p.ngram, count: p.count, share: Math.round((p.count / Math.max(row.articleCount, 1)) * 100) })),
          topEntities: (row.topEntities || []).slice(0, 10),
          topVerbs: (row.topVerbs || []).slice(0, 10),
        });
      }
      return {
        window: hist.window,
        lastUpdated: hist.lastUpdated,
        categories: out.sort((a, b) => b.articleCount - a.articleCount).slice(0, 100),
      };
    })(),
    // Patrones histórico (1 mes / fallback 3 meses) precomputados por
    // historical-patterns-poll a partir de DS /pages histórico.
    patternsByMediaHistorical: (() => {
      const hist = (state as any).publisherPatternsHistorical;
      if (!hist || !hist.patterns) return null;
      const out: Array<{ feedName: string; domain: string; articleCount: number; topPatterns: Array<{ ngram: string; count: number; share: number }> }> = [];
      for (const [domain, row] of Object.entries(hist.patterns as Record<string, any>)) {
        const top = (row.topNgrams || []).slice(0, 10);
        out.push({
          feedName: row.displayName || domain,
          domain,
          articleCount: row.articleCount || 0,
          topPatterns: top.map((p: any) => ({ ngram: p.ngram, count: p.count, share: Math.round((p.count / Math.max(row.articleCount, 1)) * 100) })),
        });
      }
      return {
        window: hist.window,
        lastUpdated: hist.lastUpdated,
        publishers: out.sort((a, b) => b.articleCount - a.articleCount).slice(0, 200),
      };
    })(),

    // Sucesos/legal/cultural/aemet no aplican en instancias verticales (sport)
    cultural: process.env.DS_CATEGORY_FILTER ? [] : culturalItems,
    culturalEntityHits: process.env.DS_CATEGORY_FILTER ? [] : Array.from(culturalEntityHits.entries()).map(([entity, hits]) => ({ entity, hits })),
    aemetEnriched: process.env.DS_CATEGORY_FILTER ? [] : aemetEnriched,
    schemaNews: process.env.DS_CATEGORY_FILTER ? {} : schemaNews,
    // Páginas DS slim para fallback del Drawer (sólo metadata necesaria)
    pagesSlim: Object.entries(state.pages || {})
      .map(([url, ps]) => ({ url, title: ps.title, image: ps.image, score: ps.score || 0, position: ps.position, domain: ps.domain, firstSeen: (ps as any).firstSeen, lastUpdated: ps.lastUpdated }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 200),
    // Artículos RSS slim (últimas 12h) para fallback del Drawer
    mediaArticlesSlim: (() => {
      const ageMsCutoff = Date.now() - 12 * 3600_000;
      const out: Array<{ title: string; link: string; feedName: string; firstSeen: string; domain?: string }> = [];
      for (const art of Object.values(state.mediaArticles || {})) {
        const ts = Date.parse((art as any).firstSeen || '') || 0;
        if (!ts || ts < ageMsCutoff) continue;
        if (!art.title || !art.link) continue;
        out.push({ title: art.title, link: art.link, feedName: art.feedName || '', firstSeen: art.firstSeen as any });
      }
      return out.sort((a, b) => (b.firstSeen || '').localeCompare(a.firstSeen || '')).slice(0, 400);
    })(),
    entityKgEnrichment: (state as any).entityKgEnrichment || {},
    entities: (() => {
      let out = entities;
      if (process.env.DS_CATEGORY_FILTER) {
        const f = process.env.DS_CATEGORY_FILTER.toLowerCase();
        out = out.filter(e => (e.category || '').toLowerCase().startsWith(f));
      }
      return out.slice(0, 100);
    })(),
    categories: (() => {
      let out = categories;
      if (process.env.DS_CATEGORY_FILTER) {
        const f = process.env.DS_CATEGORY_FILTER.toLowerCase();
        out = out.filter(c => (c.name || '').toLowerCase().startsWith(f));
      }
      return out.slice(0, 50);
    })(),
    concordances: concordances.slice(0, 50),
    opportunities: opportunitiesSorted,
    formulasLast30d,
    headlinePatterns,
    headlinePatterns4d,
    recentAlerts: (() => {
      if (!process.env.DS_CATEGORY_FILTER) return recentAlerts;
      const f = process.env.DS_CATEGORY_FILTER.toLowerCase();
      return recentAlerts.filter(r => {
        // Keep alerts whose category matches OR which are entity-derived and match via map
        const c = (r.category || '').toLowerCase();
        if (c.startsWith(f)) return true;
        // Discard schema_news_match (sucesos/legal) and other non-sport types
        if (['schema_news_match', 'category', 'stale_data'].includes(r.type)) {
          return c.startsWith(f);
        }
        // For entity alerts without category, look up in state.entityCategoryMap
        const a = (r as any).title || (r as any).entityName;
        if (a && state.entityCategoryMap[a]) {
          return state.entityCategoryMap[a].toLowerCase().startsWith(f);
        }
        return false;
      });
    })(),
    topMedia,
    weeklyHistorySummary: {
      availableWeeks: Object.keys(state.weeklyHistory || {}).sort().reverse(),
      feedNames: (() => {
        const s = new Set<string>();
        for (const wk of Object.values(state.weeklyHistory || {})) {
          for (const feedName of Object.keys(wk)) s.add(feedName);
        }
        return Array.from(s).sort();
      })(),
    },
    totals: {
      entitiesTracked: Object.keys(state.entities).length,
      categoriesTracked: Object.keys(state.categories).length,
      googleTrendsCached: Object.keys(state.trends).length,
      xTrendsCached: Object.keys(state.xTrends).length,
      mediaArticlesCached: Object.keys(state.mediaArticles).length,
    },
  };
}
