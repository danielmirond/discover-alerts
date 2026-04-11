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
    },
    // Only used in local mode (npm run dev), not in Vercel
    polling: {
      discoverIntervalMs: envInt('POLL_INTERVAL_DISCOVER_MS', 300_000),
      trendsIntervalMs: envInt('POLL_INTERVAL_TRENDS_MS', 1_800_000),
      mediaIntervalMs: envInt('POLL_INTERVAL_MEDIA_MS', 900_000),
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
