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
  feedName: string;
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
    const pageCandidates: Array<{ url: string; title: string; image: string; score: number }> = [];
    for (const [url, ps] of Object.entries(state.pages || {})) {
      if (!ps.title || !ps.image) continue;
      if (url.includes('x.com') || url.includes('twitter.com')) continue;
      if (/placeholder/i.test(ps.image)) continue;
      if (ps.title.toLowerCase().includes(nameLower)) {
        pageCandidates.push({ url, title: ps.title, image: ps.image, score: ps.score || 0 });
      }
    }
    pageCandidates.sort((a, b) => b.score - a.score);
    const topPages = pageCandidates.slice(0, 5);
    const topPage = topPages[0];

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
  const perFeed: Record<string, {
    articleCount: number;
    entityCounts: Map<string, number>;
  }> = {};

  // Pre-normalize Discover entities for substring matching
  const normalizedEntities = Object.keys(state.entities).map(name => ({
    name,
    norm: normalize(name),
  })).filter(e => e.norm.length > 3);

  // Pre-compute sets of normalized Google Trends + X Trends topics
  const gtNorms = Object.keys(state.trends).map(t => normalize(t));
  const xNorms = Object.keys(state.xTrends).map(t => normalize(t.replace(/^#/, ''))).filter(t => t.length > 2);

  for (const art of mediaArticlesArr) {
    if (!art.feedName || !art.title) continue;
    if (!perFeed[art.feedName]) {
      perFeed[art.feedName] = { articleCount: 0, entityCounts: new Map() };
    }
    perFeed[art.feedName].articleCount++;

    const titleNorm = normalize(art.title);
    for (const e of normalizedEntities) {
      if (titleNorm.includes(e.norm)) {
        const cur = perFeed[art.feedName].entityCounts.get(e.name) ?? 0;
        perFeed[art.feedName].entityCounts.set(e.name, cur + 1);
      }
    }
  }

  // Construir mapa feedName → dominios vistos (extraídos de article.link).
  // Necesario para enganchar cada medio con sus pages de Discover por dominio.
  const feedDomains: Record<string, Set<string>> = {};
  for (const art of mediaArticlesArr) {
    if (!art.feedName || !art.link) continue;
    try {
      const host = new URL(art.link).hostname.replace(/^www\./, '').toLowerCase();
      if (!feedDomains[art.feedName]) feedDomains[art.feedName] = new Set();
      feedDomains[art.feedName].add(host);
    } catch { /* noop */ }
  }

  // Top 10 páginas Discover por medio (ventana rolling 48h, ordenadas por score).
  function topDiscoverPagesForFeed(feedName: string): Array<{ url: string; title: string; image?: string; score: number; position?: number; lastUpdated?: string; firstSeen?: string }> {
    const domains = feedDomains[feedName];
    if (!domains || domains.size === 0) return [];
    const candidates: Array<{ url: string; title: string; image?: string; score: number; position?: number; lastUpdated?: string; firstSeen?: string }> = [];
    for (const [url, ps] of Object.entries(state.pages || {})) {
      if (!ps.title) continue;
      let pdom = (ps.domain || '').toLowerCase().replace(/^www\./, '');
      if (!pdom) {
        try { pdom = new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch {}
      }
      const match = [...domains].some(d => pdom === d || pdom.endsWith('.' + d));
      if (match) {
        candidates.push({ url, title: ps.title, image: ps.image, score: ps.score || 0, position: ps.position, lastUpdated: ps.lastUpdated, firstSeen: (ps as any).firstSeen });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, 10);
  }

  const topMedia: LiveTopMedia[] = Object.entries(perFeed)
    .map(([feedName, info]) => {
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
        feedName,
        articleCount: info.articleCount,
        entities,
        topDiscoverPages: topDiscoverPagesForFeed(feedName),
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
    lastPollDiscover: state.lastPollDiscover,
    lastPollTrends: state.lastPollTrends,
    lastPollMedia: state.lastPollMedia,
    lastPollX: state.lastPollX,
    cultural: culturalItems,
    culturalEntityHits: Array.from(culturalEntityHits.entries()).map(([entity, hits]) => ({ entity, hits })),
    aemetEnriched,
    schemaNews,
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
    entities: entities.slice(0, 100),
    categories: categories.slice(0, 50),
    concordances: concordances.slice(0, 50),
    opportunities: opportunitiesSorted,
    formulasLast30d,
    headlinePatterns,
    headlinePatterns4d,
    recentAlerts,
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
