import { getState } from '../state/store.js';

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
  entitySpikeWindowHours: envInt('THRESHOLD_ENTITY_SPIKE_WINDOW_HOURS', 2),
  entityAscendingWindowHours: envInt('THRESHOLD_ENTITY_ASCENDING_WINDOW_HOURS', 6),
  entityFlashMinAppearances: envInt('THRESHOLD_ENTITY_FLASH_MIN_APPEARANCES', 3),
  entitySpikeMinAppearances: envInt('THRESHOLD_ENTITY_SPIKE_MIN_APPEARANCES', 3),
  entityAscendingMinAppearances: envInt('THRESHOLD_ENTITY_ASCENDING_MIN_APPEARANCES', 3),
  trendCorrelationMin: envFloat('THRESHOLD_TREND_CORRELATION_MIN', 0.6),
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
  status: 'flash' | 'spike' | 'ascending' | 'normal';
  matchingGoogleTrends: Array<{ title: string; approxTraffic: number }>;
  matchingXTrends: Array<{ topic: string; rank: number }>;
  matchingArticles: Array<{ title: string; link: string; feedName: string }>;
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

interface LiveRecentAlert {
  type: string;
  subtype?: string;
  title: string;
  detail: string;
  timestamp: string;
  routeName: string;
}

interface LiveViewResponse {
  lastPollDiscover: string | null;
  lastPollTrends: string | null;
  lastPollMedia: string | null;
  lastPollX: string | null;
  entities: LiveEntity[];
  categories: LiveCategory[];
  concordances: LiveConcordance[];
  headlinePatterns: LiveHeadlinePattern[];
  recentAlerts: LiveRecentAlert[];
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

export function buildLiveView(): LiveViewResponse {
  const state = getState();
  const nowMs = Date.now();
  const hour = 3600_000;

  const flashWindowMs = thresholds.entityFlashWindowHours * hour;
  const spikeWindowMs = thresholds.entitySpikeWindowHours * hour;
  const ascendingWindowMs = thresholds.entityAscendingWindowHours * hour;
  const flashMin = thresholds.entityFlashMinAppearances;
  const spikeMin = thresholds.entitySpikeMinAppearances;
  const ascendingMin = thresholds.entityAscendingMinAppearances;
  const fuzzy = thresholds.trendCorrelationMin;

  const countInWindow = (timestamps: string[], windowMs: number): number =>
    timestamps.filter(ts => nowMs - new Date(ts).getTime() <= windowMs).length;

  // Compute live entities with appearance breakdowns and statuses
  const entities: LiveEntity[] = [];
  for (const [name, snap] of Object.entries(state.entities)) {
    const apps = snap.appearances ?? [];
    const c1 = countInWindow(apps, flashWindowMs);
    const c2 = countInWindow(apps, spikeWindowMs);
    const c6 = countInWindow(apps, ascendingWindowMs);

    let status: LiveEntity['status'] = 'normal';
    if (c1 >= flashMin) status = 'flash';
    else if (c2 >= spikeMin) status = 'spike';
    else if (c6 >= ascendingMin) status = 'ascending';

    if (status === 'normal') continue;

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

    entities.push({
      name,
      score: snap.score,
      position: snap.position,
      publications: snap.publications,
      category: state.entityCategoryMap[name],
      appearancesLastHour: c1,
      appearancesLast2h: c2,
      appearancesLast6h: c6,
      status,
      matchingGoogleTrends: matchingGoogleTrends.slice(0, 3),
      matchingXTrends: matchingXTrends.slice(0, 3),
      matchingArticles,
    });
  }

  // Sort by severity: flash > spike > ascending, then by score
  const statusRank: Record<LiveEntity['status'], number> = {
    flash: 3, spike: 2, ascending: 1, normal: 0,
  };
  entities.sort((a, b) => {
    const sr = statusRank[b.status] - statusRank[a.status];
    if (sr !== 0) return sr;
    return b.score - a.score;
  });

  // Live categories with 24h delta + example URLs
  const categories: LiveCategory[] = [];
  for (const [idStr, snap] of Object.entries(state.categories)) {
    const history = snap.history ?? [];
    const oldest = history.length > 0 ? history[0] : null;
    const score24hAgo = oldest?.score ?? null;
    const delta = score24hAgo != null ? snap.score - score24hAgo : null;
    const id = Number(idStr);
    const examplePages = (state.categoryExamplePages[id] ?? []).slice(0, 5);

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
    switch (a.type) {
      case 'entity':
        title = a.name;
        detail = `score=${a.score} | pos=#${a.position}${a.appearanceCount != null ? ` | ${a.appearanceCount} en ${a.windowHours}h` : ''}`;
        break;
      case 'entity_concordance':
        title = a.entityName;
        detail = `score=${a.score} | pos=#${a.position}`;
        break;
      case 'entity_coverage':
        title = a.entityName;
        detail = `${a.coverageCount} publicaciones en ${a.mediaOutlets.length} medios`;
        break;
      case 'category':
        title = a.name;
        detail = `score ${a.prevScore} → ${a.score}${a.windowHours ? ` (${a.windowHours}h)` : ''}`;
        break;
      case 'headline_pattern':
        title = `"${a.ngram}"`;
        detail = `${a.count} titulares`;
        break;
      case 'trends_correlation':
        title = a.trendTitle;
        detail = `${a.matchingEntities.length} entidades | trafico ~${a.approxTraffic}`;
        break;
      case 'trends_new_topic':
        title = a.title;
        detail = `nuevo trending | trafico ~${a.approxTraffic}`;
        break;
    }
    return {
      type: a.type,
      subtype: a.subtype,
      title,
      detail,
      timestamp: r.timestamp,
      routeName: r.routeName,
    };
  });

  // Headline patterns (3+ words, 3+ occurrences)
  const headlinePatterns: LiveHeadlinePattern[] = Object.entries(state.headlinePatterns)
    .map(([ngram, count]) => ({ ngram, count, words: ngram.split(' ').length }))
    .filter(p => p.words >= 3 && p.count >= 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    lastPollDiscover: state.lastPollDiscover,
    lastPollTrends: state.lastPollTrends,
    lastPollMedia: state.lastPollMedia,
    lastPollX: state.lastPollX,
    entities: entities.slice(0, 20),
    categories: categories.slice(0, 15),
    concordances: concordances.slice(0, 20),
    headlinePatterns,
    recentAlerts,
    totals: {
      entitiesTracked: Object.keys(state.entities).length,
      categoriesTracked: Object.keys(state.categories).length,
      googleTrendsCached: Object.keys(state.trends).length,
      xTrendsCached: Object.keys(state.xTrends).length,
      mediaArticlesCached: Object.keys(state.mediaArticles).length,
    },
  };
}
