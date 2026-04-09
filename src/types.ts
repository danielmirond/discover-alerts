// DiscoverSnoop API response envelope
export interface ApiResponse<T> {
  status: boolean;
  transaction_id: string;
  transaction_state: string;
  data: T[];
  results?: number;
  info?: unknown[];
}

// DiscoverSnoop data types
export interface DiscoverEntity {
  name: string;
  score: number;
  score_decimal: number;
  position: number;
  publications: number;
  firstviewed: string;
  lastviewed: string;
}

export interface DiscoverCategory {
  id: number;
  name: string;
  score: number;
  score_decimal: number;
  position: number;
  publications: number;
  firstviewed: string;
  lastviewed: string;
}

export interface DiscoverPage {
  url: string;
  title: string;
  title_original: string;
  title_english: string;
  image: string;
  snippet: string;
  publisher: string;
  domain: string;
  category: string;
  story_type: string;
  score: number;
  score_decimal: number;
  position: number;
  publications: number;
  firstviewed: string;
  lastviewed: string;
  is_new: boolean;
  is_video: boolean;
  is_webstory: boolean;
  entities: string[];
  ai_overviews: string[];
}

export interface DiscoverDomain {
  domain: string;
  score: number;
  score_decimal: number;
  position: number;
  publications: number;
  firstviewed: string;
  lastviewed: string;
}

export interface DiscoverSocial {
  channel: string;
  score: number;
  score_decimal: number;
  position: number;
  publications: number;
  firstviewed: string;
  lastviewed: string;
}

export interface CategoryListItem {
  id: number;
  name: string;
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
}

export interface CategorySnapshot {
  name: string;
  score: number;
  scoreDecimal: number;
  position: number;
  publications: number;
  lastUpdated: string;
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
  pages: Record<string, PageSnapshot>;
  domains: Record<string, DomainSnapshot>;
  trends: Record<string, TrendSnapshot>;
  headlinePatterns: Record<string, number>;
  dedupHashes: Record<string, number>;
  mediaArticles: Record<string, { feedName: string; firstSeen: string }>;
  lastPollDiscover: string | null;
  lastPollTrends: string | null;
  lastPollMedia: string | null;
}

// Alert types
export interface EntityAlert {
  type: 'entity';
  subtype: 'new' | 'rising';
  name: string;
  score: number;
  prevScore: number;
  scoreDecimal: number;
  position: number;
  prevPosition: number;
  publications: number;
  firstviewed: string;
}

export interface CategoryAlert {
  type: 'category';
  subtype: 'spike';
  id: number;
  name: string;
  score: number;
  prevScore: number;
  position: number;
  prevPosition: number;
  publications: number;
  prevPublications: number;
}

export interface HeadlinePatternAlert {
  type: 'headline_pattern';
  ngram: string;
  count: number;
  prevCount: number;
  matchingTitles: string[];
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
  | MediaDiscoverCorrelationAlert;

// Media RSS types
export interface MediaFeed {
  name: string;
  url: string;
  category: string;
}

export interface MediaArticle {
  feedName: string;
  feedCategory: string;
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

export interface MediaDiscoverCorrelationAlert {
  type: 'media_discover_correlation';
  articleTitle: string;
  articleLink: string;
  feedName: string;
  feedCategory: string;
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
