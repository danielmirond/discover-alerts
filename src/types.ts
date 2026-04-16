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

export interface AppState {
  entities: Record<string, EntitySnapshot>;
  categories: Record<number, CategorySnapshot>;
  categoryExamplePages: Record<number, CategoryExamplePage[]>;
  pages: Record<string, PageSnapshot>;
  domains: Record<string, DomainSnapshot>;
  trends: Record<string, TrendSnapshot>;
  xTrends: Record<string, XTrendSnapshot>; // Twitter/X trends
  headlinePatterns: Record<string, number>;
  headlinePatternsHistory: Array<{ ngram: string; count: number; timestamp: string }>;
  dedupHashes: Record<string, number>;
  mediaArticles: Record<string, { feedName: string; feedCategory: string; feedScope?: 'nacional' | 'internacional'; title: string; link: string; firstSeen: string }>;
  entityCategoryMap: Record<string, string>; // entity name -> derived category (from pages)
  recentAlerts: Array<{ alert: Alert; timestamp: string; routeName: string }>; // last 6h of alerts sent to Slack
  weeklyHistory: Record<string, Record<string, WeeklyMediaStats>>; // weekKey -> feedName -> stats
  lastPollDiscover: string | null;
  lastPollTrends: string | null;
  lastPollMedia: string | null;
  lastPollX: string | null;
}

// Alert types
export interface MatchedMediaArticle {
  feedName: string;
  feedCategory: string;
  title: string;
  link: string;
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
  appearanceCount?: number;        // only for 'ascending' subtype
  windowHours?: number;            // only for 'ascending' subtype
  matchingTrends?: MatchedTrend[];  // Google Trends enrichment
  matchingXTrends?: MatchedXTrend[]; // X/Twitter trends enrichment
  matchingArticles?: MatchedMediaArticle[]; // Media articles enrichment
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
  | EntityCoverageAlert
  | EntityConcordanceAlert
  | OwnMediaAlert
  | OwnMediaAbsentAlert
  | TrendsWithoutDiscoverAlert
  | HeadlineClusterAlert
  | StaleDataAlert
  | MultiEntityArticleAlert;

// Media RSS types
export interface MediaFeed {
  name: string;
  url: string;
  category: string;
  domain?: string;
  /** 'nacional' (default) | 'internacional' — affects alert labeling */
  scope?: 'nacional' | 'internacional';
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
  otherOutlets: string[];
  otherTitles: string[];
}

export interface TrendsWithoutDiscoverAlert {
  type: 'trends_without_discover';
  trendTitle: string;
  approxTraffic: number;
  newsItems: Array<{ title: string; url: string; source: string }>;
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
}

export interface EntityConcordanceAlert {
  type: 'entity_concordance';
  subtype: 'discover_trends_x' | 'discover_rss' | 'discover_trends' | 'discover_x';
  entityName: string;
  score: number;
  position: number;
  publications: number;
  category?: string;
  matchingTrends: MatchedTrend[];
  matchingXTrends: MatchedXTrend[];
  matchingArticles: MatchedMediaArticle[];
}

// Poll results
export interface DiscoverPollData {
  entities: DiscoverEntity[];
  categories: DiscoverCategory[];
  pages: DiscoverPage[];
  domains: DiscoverDomain[];
  social: DiscoverSocial[];
}
