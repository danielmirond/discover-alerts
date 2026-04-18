function env(key: string, fallback?: string): string {
  const val = process.env[key];
  if (!val && fallback === undefined) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return val || fallback!;
}

function envInt(key: string, fallback: number): number {
  const val = process.env[key];
  return val ? parseInt(val, 10) : fallback;
}

function envFloat(key: string, fallback: number): number {
  const val = process.env[key];
  return val ? parseFloat(val) : fallback;
}

export function getConfig() {
  return {
    discoversnoop: {
      token: env('DISCOVERSNOOP_TOKEN'),
      baseUrl: 'https://api.discoversnoop.com',
      country: env('DISCOVER_COUNTRY', 'ES'),
      hours: envInt('DISCOVER_HOURS', 6),
      lines: envInt('DISCOVER_LINES', 100),
    },
    slack: {
      // Default webhook - used as fallback when no route matches in routing.json
      webhookUrl: env('SLACK_WEBHOOK_URL'),
    },
    thresholds: {
      entityScoreJump: envInt('THRESHOLD_ENTITY_SCORE_JUMP', 20),
      entityNewMinScore: envInt('THRESHOLD_ENTITY_NEW_MIN_SCORE', 10),
      entityAscendingMinAppearances: envInt('THRESHOLD_ENTITY_ASCENDING_MIN_APPEARANCES', 3),
      entityAscendingWindowHours: envInt('THRESHOLD_ENTITY_ASCENDING_WINDOW_HOURS', 6),
      // longtail: "se repite a lo largo del dia" (2h window, 5 apariciones)
      entityLongtailMinAppearances: envInt('THRESHOLD_ENTITY_LONGTAIL_MIN_APPEARANCES', 5),
      entityLongtailWindowHours: envInt('THRESHOLD_ENTITY_LONGTAIL_WINDOW_HOURS', 2),
      // flash: "pico rapido" (1h window, 3 apariciones)
      entityFlashMinAppearances: envInt('THRESHOLD_ENTITY_FLASH_MIN_APPEARANCES', 3),
      entityFlashWindowHours: envFloat('THRESHOLD_ENTITY_FLASH_WINDOW_HOURS', 1),
      // discover_1h: 3+ apariciones en 1h (paralelo a flash)
      entityDiscover1hMinAppearances: envInt('THRESHOLD_ENTITY_DISCOVER_1H_MIN', 3),
      // discover_3h: 5+ apariciones en 3h
      entityDiscover3hMinAppearances: envInt('THRESHOLD_ENTITY_DISCOVER_3H_MIN', 5),
      // discover_12h: 7+ apariciones en 12h
      entityDiscover12hMinAppearances: envInt('THRESHOLD_ENTITY_DISCOVER_12H_MIN', 7),
      // Min entities per article for multi_entity_article alert
      multiEntityArticleMin: envInt('THRESHOLD_MULTI_ENTITY_ARTICLE_MIN', 2),
      // Max age of an RSS article (in hours) for it to count towards coverage/multi-entity alerts
      mediaMaxAgeHours: envInt('THRESHOLD_MEDIA_MAX_AGE_HOURS', 12),
      categoryDayScoreJump: envInt('THRESHOLD_CATEGORY_DAY_SCORE_JUMP', 30),
      categoryScoreJump: envInt('THRESHOLD_CATEGORY_SCORE_JUMP', 15),
      categoryPublicationsJumpPct: envFloat('THRESHOLD_CATEGORY_PUB_JUMP_PCT', 0.5),
      headlineMinFrequency: envInt('THRESHOLD_HEADLINE_MIN_FREQUENCY', 3),
      trendCorrelationMin: envFloat('THRESHOLD_TREND_CORRELATION_MIN', 0.6),
    },
    dedup: {
      windowHours: envInt('DEDUP_WINDOW_HOURS', 6),
    },
    ownMedia: {
      // Comma-separated list of domains that belong to us.
      // Used to fire own_media_detected alerts when they show up in
      // DiscoverSnoop, trends or multi-outlet coverage.
      domains: env('OWN_MEDIA_DOMAINS', '')
        .split(',')
        .map(d => d.trim().toLowerCase())
        .filter(d => d.length > 0),
      // Minimum OTHER outlets required to trigger 'coverage' own-media alert
      coverageMinOtherOutlets: envInt('OWN_MEDIA_COVERAGE_MIN_OTHERS', 1),
      // For own_media_absent: minimum competitors that cover an entity before
      // we alert that "they're covering, we're not"
      absentMinOthers: envInt('OWN_MEDIA_ABSENT_MIN_OTHERS', 3),
      // Restricts absent alerts to entities in these DS categories (substring)
      // Empty = all categories. For sports-focused media like Mundo Deportivo
      // default to Sports.
      absentCategoryFilter: env('OWN_MEDIA_ABSENT_CATEGORY_FILTER', 'Sport')
        .toLowerCase(),
    },
    cluster: {
      // headline_cluster: min number of distinct entities firing flash/spike
      // within the cluster window for us to consider "big event"
      minEntities: envInt('THRESHOLD_CLUSTER_MIN_ENTITIES', 4),
      windowHours: envFloat('THRESHOLD_CLUSTER_WINDOW_HOURS', 1),
    },
    tripleMatch: {
      // Max Discover position (1 = top). Lower = stricter.
      maxDiscoverPosition: envInt('THRESHOLD_TRIPLE_MATCH_MAX_POS', 50),
      // Min total approxTraffic summed across matching Trends topics.
      minTotalTraffic: envInt('THRESHOLD_TRIPLE_MATCH_MIN_TRAFFIC', 2000),
      // Max X/Twitter rank (1 = top). Lower = stricter.
      maxXRank: envInt('THRESHOLD_TRIPLE_MATCH_MAX_X_RANK', 30),
    },
    staleData: {
      // Alert if any poll hasn't run in this many minutes.
      // Default 90 min (3x la cadencia más larga = trends/x cada 30min). Los
      // scheduled workflows de GitHub Actions se retrasan regularmente 15-30
      // min en periodos de alta carga, y 45 min producía falsos positivos
      // semanales. Si necesitas detección más estricta, baja via env var.
      maxMinutesStale: envInt('THRESHOLD_STALE_MINUTES', 90),
    },
    trendsWithoutDiscover: {
      // Only alert on trends with at least this traffic
      minApproxTraffic: envInt('THRESHOLD_TRENDS_WITHOUT_DISCOVER_MIN_TRAFFIC', 10_000),
    },
    // Only used in local mode (npm run dev), not in Vercel
    polling: {
      discoverIntervalMs: envInt('POLL_INTERVAL_DISCOVER_MS', 300_000),
      trendsIntervalMs: envInt('POLL_INTERVAL_TRENDS_MS', 1_800_000),
      mediaIntervalMs: envInt('POLL_INTERVAL_MEDIA_MS', 900_000),
      boeIntervalMs: envInt('POLL_INTERVAL_BOE_MS', 21_600_000), // 6 hours
    },
  };
}

// Lazy singleton for backwards compat
let _config: ReturnType<typeof getConfig> | null = null;
export const config = new Proxy({} as ReturnType<typeof getConfig>, {
  get(_, prop) {
    if (!_config) _config = getConfig();
    return (_config as any)[prop];
  },
});

export type Config = ReturnType<typeof getConfig>;
