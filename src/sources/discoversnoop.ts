import { config } from '../config.js';
import type {
  ApiResponse,
  DiscoverEntity,
  DiscoverCategory,
  DiscoverPage,
  DiscoverDomain,
  DiscoverSocial,
  CategoryListItem,
} from '../types.js';

async function fetchEndpoint<T>(
  path: string,
  params: Record<string, string | number> = {},
): Promise<T[]> {
  const { baseUrl, token } = config.discoversnoop;
  const url = new URL(path, baseUrl);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  const rawText = await res.text();

  if (!res.ok) {
    throw new Error(`DiscoverSnoop ${path} HTTP ${res.status}: ${rawText}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(`DiscoverSnoop ${path} invalid JSON: ${rawText.slice(0, 500)}`);
  }

  // API wraps the response in an array: [{ status, data, ... }]
  const json = (Array.isArray(parsed) ? parsed[0] : parsed) as ApiResponse<T>;

  if (!json?.status) {
    throw new Error(
      `DiscoverSnoop ${path} status=false: ${JSON.stringify(json).slice(0, 300)}`,
    );
  }

  return json.data ?? [];
}

function liveParams() {
  const { country, hours, lines } = config.discoversnoop;
  return { country, hours, lines };
}

export function fetchLiveEntities(): Promise<DiscoverEntity[]> {
  return fetchEndpoint<DiscoverEntity>('/liveentities', liveParams());
}

export function fetchLiveCategories(): Promise<DiscoverCategory[]> {
  return fetchEndpoint<DiscoverCategory>('/livecategories', liveParams());
}

export function fetchLivePages(): Promise<DiscoverPage[]> {
  return fetchEndpoint<DiscoverPage>('/livepages', liveParams());
}

export function fetchLiveDomains(): Promise<DiscoverDomain[]> {
  return fetchEndpoint<DiscoverDomain>('/livedomains', liveParams());
}

export function fetchLiveSocial(): Promise<DiscoverSocial[]> {
  return fetchEndpoint<DiscoverSocial>('/livesocial', liveParams());
}

export function fetchCategoriesList(): Promise<CategoryListItem[]> {
  return fetchEndpoint<CategoryListItem>('/categories_list');
}

// Historical endpoints (date-ranged)
interface HistoricalParams {
  from_date: string; // YYYY-MM-DD
  to_date: string;
  lines?: number;
}

export function fetchHistoricalEntities(p: HistoricalParams): Promise<DiscoverEntity[]> {
  return fetchEndpoint<DiscoverEntity>('/entities', {
    country: config.discoversnoop.country,
    from_date: p.from_date,
    to_date: p.to_date,
    lines: p.lines ?? 500,
  });
}

export function fetchHistoricalCategories(p: HistoricalParams): Promise<DiscoverCategory[]> {
  return fetchEndpoint<DiscoverCategory>('/categories', {
    country: config.discoversnoop.country,
    from_date: p.from_date,
    to_date: p.to_date,
    lines: p.lines ?? 500,
  });
}

export function fetchHistoricalPages(p: HistoricalParams): Promise<DiscoverPage[]> {
  return fetchEndpoint<DiscoverPage>('/pages', {
    country: config.discoversnoop.country,
    from_date: p.from_date,
    to_date: p.to_date,
    lines: p.lines ?? 500,
  });
}

export function fetchHistoricalDomains(p: HistoricalParams): Promise<DiscoverDomain[]> {
  return fetchEndpoint<DiscoverDomain>('/domains', {
    country: config.discoversnoop.country,
    from_date: p.from_date,
    to_date: p.to_date,
    lines: p.lines ?? 500,
  });
}
