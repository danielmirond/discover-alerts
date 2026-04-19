// DiscoverSnoop API response envelope
export interface ApiResponse<T> {
  status: boolean;
  transaction_id: string;
  transaction_state: string;
  data: T[];
  results?: number;
  info?: unknown[];
}

// DiscoverSnoop data types (matching actual API response)
export interface DiscoverEntity {
  entity: string;
  country: string;
  score: number;
  score_decimal: number;
  position: number;
  publications: number;
}

export interface DiscoverCategory {
  id: number;
  is_root: boolean;
  score: number;
  score_decimal: number;
  position: number;
  publications: number;
}

export interface DiscoverPage {
  url: string;
  title: string;
  title_original?: string;
  title_english?: string;
  image?: string;
  snippet?: string;
  publisher?: string;
  domain?: string;
  category?: string | number;
  story_type?: string;
  score: number;
  score_decimal?: number;
  position?: number;
  publications?: number;
  firstviewed?: string;
  lastviewed?: string;
  is_new?: boolean;
  is_video?: boolean;
  is_webstory?: boolean;
  entities?: string[];
  ai_overviews?: string[];
}

export interface DiscoverDomain {
  publisher: string;
  publisher_url: string;
  score: number;
  score_decimal: number;
  position: number;
  publications: number;
  firstviewed?: string;
  lastviewed?: string;
}

export interface DiscoverSocial {
  platform: string;
  channel: string;
  publisher_url: string | null;
  score: number;
  score_decimal: number;
  position: number;
  publications: number;
  firstviewed?: string;
  lastviewed?: string;
}

export interface CategoryListItem {
  id: number;
  name: string;
}

// X (Twitter) trends via getdaytrends.com
export interface XTrendItem {
  rank: number;
  topic: string;
  url: string;
}

export interface XTrendSnapshot {
  rank: number;
  firstSeen: string;
  lastUpdated: string;
}

// Google Trends RSS types
export interface TrendsNewsItem {
  title: string;
  source: string;
  url: string;
  picture?: string;
}

export interface TrendsItem {
  title: string;
  approxTraffic: number;
  pubDate: string;
  link: string;
  picture?: string;
  newsItems: TrendsNewsItem[];
}

// State types
export interface EntitySnapshot {
  score: number;
  scoreDecimal: number;
  position: number;
  publications: number;
  firstSeen: string;
  lastUpdated: string;
  appearances: string[]; // ISO timestamps of each time this entity was seen in a poll
}

export interface CategoryHistoryPoint {
  timestamp: string;
  score: number;
  publications: number;
}

export interface CategorySnapshot {
  name: string;
  score: number;
  scoreDecimal: number;
  position: number;
  publications: number;
  lastUpdated: string;
  history: CategoryHistoryPoint[]; // rolling 24h of samples
}

export interface PageSnapshot {
  title: string;
  score: number;
  position: number;
  lastUpdated: string;
}

export interface DomainSnapshot {
  score: number;
  position: number;
  publications: number;
  lastUpdated: string;
}

export interface TrendSnapshot {
  approxTraffic: number;
  firstSeen: string;
  lastUpdated: string;
}

/** Extended trend snapshot with news examples. Used for US trends so we can
 * render headlines/sources in the dashboard without re-fetching. */
export interface TrendSnapshotWithNews extends TrendSnapshot {
  newsItems?: Array<{ title: string; url: string; source: string }>;
  /** Geo code (e.g. 'US'). Defaults to 'ES' implicitly on state.trends. */
  geo?: string;
}

export interface AppState {
  entities: Record<string, EntitySnapshot>;
  categories: Record<number, CategorySnapshot>;
  categoryExamplePages: Record<number, CategoryExamplePage[]>;
  pages: Record<string, PageSnapshot>;
  domains: Record<string, DomainSnapshot>;
  trends: Record<string, TrendSnapshot>;
  trendsUS?: Record<string, TrendSnapshotWithNews>; // Google Trends US con cabida editorial
  xTrends: Record<string, XTrendSnapshot>; // Twitter/X trends
  headlinePatterns: Record<string, number>;
  headlinePatternsHistory: Array<{ ngram: string; count: number; timestamp: string }>;
  dedupHashes: Record<string, number>;
  mediaArticles: Record<string, { feedName: string; feedCategory: string; feedScope?: 'nacional' | 'internacional'; title: string; link: string; firstSeen: string; pubDate?: string; description?: string }>;
  boeItems: Record<string, { firstSeen: string }>;
  entityCategoryMap: Record<string, string>;
  entityTopicMap: Record<string, string>;
  formulaUsage?: Array<{
    matchKey: string;
    alertType: string;
    alertSubtype?: string;
    alertTopic?: string;
    entityName?: string;
    entityScore?: number;
    timestamp: string;
  }>;
  llmTopicCache?: Record<string, { topic: string; ts: number }>;
  recentAlerts: Array<{ alert: Alert; timestamp: string; routeName: string }>;
  weeklyHistory: Record<string, Record<string, WeeklyMediaStats>>;
  lastPollDiscover: string | null;
  lastPollTrends: string | null;
  lastPollMedia: string | null;
  lastPollBoe: string | null;
  lastPollX: string | null;
}

// Alert types
export interface MatchedMediaArticle {
  feedName: string;
  feedCategory: string;
  title: string;
  link: string;
  /** RSS description/snippet (truncated). Para el bloque "Así lo cuentan" en Slack. */
  description?: string;
}

export interface MatchedTrend {
  title: string;
  approxTraffic: number;
}

export interface MatchedXTrend {
  topic: string;
  rank: number;
  url: string;
}

export interface EntityAlert {
  type: 'entity';
  subtype:
    | 'new'
    | 'rising'
    | 'ascending'
    | 'longtail'
    | 'flash'
    | 'spike'
    | 'discover_1h'
    | 'discover_3h'
    | 'discover_12h';
  name: string;
  score: number;
  prevScore: number;
  scoreDecimal: number;
  position: number;
  prevPosition: number;
  publications: number;
  firstviewed: string;
  category?: string;               // derived from pages (for routing)
  topic?: string;                  // derived topic (sucesos/legal/...) from topics.json
  /** Velocity/momentum snapshot at emission time (for forecasting). */
  velocity?: {
    v1h: number;
    v3hRate: number;
    v12hRate: number;
    acceleration: number;
    momentum: 'rising' | 'peaking' | 'fading' | 'steady' | 'new';
  };
  appearanceCount?: number;        // only for 'ascending' subtype
  windowHours?: number;            // only for 'ascending' subtype
  matchingTrends?: MatchedTrend[];  // Google Trends enrichment
  matchingXTrends?: MatchedXTrend[]; // X/Twitter trends enrichment
  matchingArticles?: MatchedMediaArticle[]; // Media articles enrichment
  /** Snippets reales de páginas Discover donde aparece la entidad (hasta 3). */
  contextSnippets?: string[];
  /** Imagen que Google Discover está mostrando para esta entidad (de DiscoverSnoop page.image). */
  imageUrl?: string;
  imageAlt?: string;
  /** Análisis de cumplimiento Discover de la imagen. */
  imageCheck?: ImageCheck;
}

/** Chequeo técnico y editorial de imagen contra requisitos Discover. */
export interface ImageCheck {
  /** Dimensiones en px si se pudieron leer */
  width?: number;
  height?: number;
  /** Ratio ancho/alto (Discover recomienda ~16:9 = 1.77) */
  aspectRatio?: number;
  /** Cumple min 1200px ancho */
  meetsWidth?: boolean;
  /** Cumple min 300.000 px totales */
  meetsPixels?: boolean;
  /** Aspect ratio aproximado a 16:9 (0.5 tolerance) */
  meetsRatio?: boolean;
  /** Descripción LLM opcional (¿contiene texto? ¿gente reconocible?) */
  llmDescription?: string;
  /** Resumen ejecutivo: apta / revisar / no apta */
  verdict?: 'apta' | 'revisar' | 'no apta';
  /** Notas explicativas cortas (ej. 'ratio correcto, resolución baja'). */
  notes?: string[];
}

export interface CategoryExamplePage {
  title: string;
  url: string;
  publisher?: string;
}

export interface CategoryAlert {
  type: 'category';
  subtype: 'spike' | 'day_spike';
  id: number;
  name: string;
  score: number;
  prevScore: number;
  position: number;
  prevPosition: number;
  publications: number;
  prevPublications: number;
  windowHours?: number; // for day_spike: how far back we compared
  examplePages?: CategoryExamplePage[]; // example news in this category
}

export interface HeadlinePatternAlert {
  type: 'headline_pattern';
  ngram: string;
  count: number;
  prevCount: number;
  matchingTitles: string[];
  category?: string; // derived from matching pages
  topic?: string;    // derived topic from topics.json
}

export interface TrendsCorrelationAlert {
  type: 'trends_correlation';
  trendTitle: string;
  approxTraffic: number;
  matchingEntities: string[];
  matchingPageTitles: string[];
  similarityScore: number;
}

export interface TrendsNewTopicAlert {
  type: 'trends_new_topic';
  title: string;
  approxTraffic: number;
  newsItems: TrendsNewsItem[];
}

export type Alert =
  | EntityAlert
  | CategoryAlert
  | HeadlinePatternAlert
  | TrendsCorrelationAlert
  | TrendsNewTopicAlert
  | BoeDiscoverCorrelationAlert
  | EntityCoverageAlert
  | EntityConcordanceAlert
  | TripleMatchAlert
  | OwnMediaAlert
  | OwnMediaAbsentAlert
  | TrendsWithoutDiscoverAlert
  | HeadlineClusterAlert
  | StaleDataAlert
  | MultiEntityArticleAlert
  | MeneameHotAlert
  | WikipediaSurgeAlert
  | FirstMoverAlert;

// Media RSS types
export interface MediaFeed {
  name: string;
  url: string;
  category: string;
  domain?: string;
  /** 'nacional' (default) | 'internacional' — affects alert labeling */
  scope?: 'nacional' | 'internacional';
  /**
   * 'rss' (default) for standard RSS/Atom feeds
   * 'news-sitemap' for Google News-format sitemaps (<news:news> schema)
   */
  type?: 'rss' | 'news-sitemap';
  /** Si true, este feed es una agencia wire (EFE, Europa Press, Reuters).
   * Las alertas first_mover con este feed como único publisher se elevan
   * a prioridad 'wire' (más alta) porque es la fuente primaria que el
   * resto cita en 15-60 min. */
  wire?: boolean;
}

export interface WeeklyMediaStats {
  articleCount: number;
  /** Entity name -> times mentioned in titles this week */
  entities: Record<string, number>;
  /** DiscoverSnoop category -> count (derived from entities via entityCategoryMap) */
  categories: Record<string, number>;
  /** 3-gram patterns -> occurrences */
  patterns: Record<string, number>;
  /** Static category of the feed itself (generalista/deportivo/tech) */
  feedCategory?: string;
}

export interface OwnMediaAbsentAlert {
  type: 'own_media_absent';
  entityName: string;
  category?: string;
  topic?: string;
  otherOutlets: string[];
  otherTitles: string[];
  /** Snippets reales de Discover/RSS donde aparece la entidad. */
  contextSnippets?: string[];
}

export interface TrendsWithoutDiscoverAlert {
  type: 'trends_without_discover';
  trendTitle: string;
  approxTraffic: number;
  topic?: string; // derived from trend title (classified via topics.json)
  newsItems: Array<{ title: string; url: string; source: string }>;
  /** Descriptions de los newsItems como context snippets. */
  contextSnippets?: string[];
}

export interface HeadlineClusterAlert {
  type: 'headline_cluster';
  entitiesInCluster: string[];
  windowHours: number;
  timestamp: string;
}

export interface StaleDataAlert {
  type: 'stale_data';
  source: 'discover' | 'trends' | 'media' | 'x';
  lastPollAgoMinutes: number;
}

export interface MultiEntityArticleAlert {
  type: 'multi_entity_article';
  articleTitle: string;
  articleLink: string;
  feedName: string;
  feedCategory: string;
  feedScope?: 'nacional' | 'internacional';
  entities: string[];
  /** Derived DS category (majority vote across entities) */
  category?: string;
  /** Derived topic (sucesos/legal/...) majority vote across entities */
  topic?: string;
  /** Description del artículo cuando el feed la trae. */
  contextSnippets?: string[];
}

export interface OwnMediaAlert {
  type: 'own_media';
  subtype: 'discover_page' | 'trends_news' | 'coverage_join';
  /** Our domain that matched */
  ownDomain: string;
  /** Title or topic that triggered */
  title: string;
  url?: string;
  /** For coverage_join: names of other outlets also covering */
  otherOutlets?: string[];
  /** For discover_page: the score/position of the page in Discover */
  score?: number;
  position?: number;
  /** For trends_news: the Google Trends topic this was tied to */
  trendTopic?: string;
  /** Derived category if available */
  category?: string;
  /** Derived topic (sucesos/legal/...) if available */
  topic?: string;
}

export interface MediaArticle {
  feedName: string;
  feedCategory: string;
  feedScope?: 'nacional' | 'internacional';
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

export interface EntityCoverageAlert {
  type: 'entity_coverage';
  entityName: string;
  coverageCount: number;
  mediaOutlets: string[];
  articles: Array<{
    title: string;
    link: string;
    feedName: string;
    feedCategory: string;
    feedScope?: 'nacional' | 'internacional';
  }>;
  category?: string; // derived entity category (for routing)
  topic?: string;    // derived topic (sucesos/legal/...)
  /** Descriptions de los RSS articles como context snippets. */
  contextSnippets?: string[];
}

export interface EntityConcordanceAlert {
  type: 'entity_concordance';
  subtype: 'discover_trends_x' | 'discover_rss' | 'discover_trends' | 'discover_x';
  entityName: string;
  score: number;
  position: number;
  publications: number;
  category?: string;
  topic?: string;
  matchingTrends: MatchedTrend[];
  matchingXTrends: MatchedXTrend[];
  matchingArticles: MatchedMediaArticle[];
  /** Snippets reales de Discover/RSS donde aparece la entidad. */
  contextSnippets?: string[];
}

/**
 * Triple Match: Discover + Google Trends + X/Twitter (+ optionally RSS) align
 * for the same entity with strong momentum signals. Escalation of
 * entity_concordance/discover_trends_x: same conditions plus hard thresholds
 * (position, trend traffic, X rank) to guarantee editorial relevance.
 */
export interface TripleMatchAlert {
  type: 'triple_match';
  entityName: string;
  category?: string;
  topic?: string;
  score: number;
  position: number;
  publications: number;
  /** Sum of approxTraffic across matching Google Trends topics. */
  totalTrafficEstimate: number;
  /** Best (lowest) rank across matching X/Twitter trends (1 = top). */
  bestXRank: number;
  /** Count of distinct media outlets covering (0 means RSS missed). */
  outletCount: number;
  matchingTrends: MatchedTrend[];
  matchingXTrends: MatchedXTrend[];
  matchingArticles: MatchedMediaArticle[];
  /** Snippets reales de Discover/RSS donde aparece la entidad. */
  contextSnippets?: string[];
}

/**
 * Menéame hot story: artículo viral en Menéame (karma alto + recién publicado)
 * que cruzamos con el estado Discover. Si no hay match con una entidad Discover,
 * es señal "viral upstream sin Discover aún" → oportunidad de ir primero.
 */
export interface MeneameHotAlert {
  type: 'meneame_hot';
  title: string;
  storyUrl: string;
  externalUrl: string;
  karma: number;
  votes: number;
  comments: number;
  pubDate: string;
  sub: string;
  topic?: string;
  /** Entidades Discover ES que matchean el titulo (si existen) — util para cross-ref */
  matchingDiscoverEntities: string[];
  /** true si el tema NO esta aún en Discover = señal predictiva */
  discoverAbsent: boolean;
}

/**
 * Wikipedia surge: artículo Wikipedia ES con spike de edits. Señal de breaking
 * news en curso. Si cruza entidad Discover nueva, ventaja editorial.
 */
export interface WikipediaSurgeAlert {
  type: 'wikipedia_surge';
  title: string;
  url: string;
  editCount: number;
  uniqueEditors: number;
  windowMinutes: number;
  topic?: string;
  matchingDiscoverEntities: string[];
  discoverAbsent: boolean;
}

/**
 * First mover: una entidad ha sido publicada SOLO por un medio en los últimos
 * N minutos. Mientras el resto no entra, ese medio tiene la exclusiva. Para la
 * redacción propia: o competir de inmediato, o decidir saltar por falta de
 * corroboración.
 */
export interface FirstMoverAlert {
  type: 'first_mover';
  entityName: string;
  feedName: string;
  title: string;
  link: string;
  pubDate?: string;
  windowMinutes: number;
  category?: string;
  topic?: string;
  /** true si el único publisher es un feed marcado wire:true (EFE, EP, Reuters). */
  isWire?: boolean;
}

// BOE types
export interface BoeItem {
  identificador: string;
  titulo: string;
  urlPdf: string;
  urlHtml: string;
  seccion: string;
  departamento: string;
  epigrafe: string;
}

export interface BoeDiscoverCorrelationAlert {
  type: 'boe_discover_correlation';
  boeTitle: string;
  boeId: string;
  boeUrl: string;
  departamento: string;
  seccion: string;
  matchingEntities: string[];
  matchingPageTitles: string[];
  similarityScore: number;
}

// Poll results
export interface DiscoverPollData {
  entities: DiscoverEntity[];
  categories: DiscoverCategory[];
  pages: DiscoverPage[];
  domains: DiscoverDomain[];
  social: DiscoverSocial[];
}
