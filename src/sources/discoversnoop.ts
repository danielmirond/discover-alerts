import { config } from '../config.js';
import { withRetry } from '../utils/retry.js';
import { validateApiResponse } from '../utils/validate.js';
import type {
  ApiResponse,
  DiscoverEntity,
  DiscoverCategory,
  DiscoverPage,
  DiscoverDomain,
  DiscoverSocial,
  CategoryListItem,
} from '../types.js';

const { baseUrl, token, country, hours, lines } = config.discoversnoop;

async function fetchEndpointOnce<T>(
  path: string,
  params: Record<string, string | number> = {},
): Promise<T[]> {
  const url = new URL(path, baseUrl);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`DiscoverSnoop ${path} ${res.status}: ${text}`);
  }

  const raw = await res.json();
  const json = validateApiResponse<T>(raw, `DiscoverSnoop ${path}`);
  if (!json.status) {
    throw new Error(`DiscoverSnoop ${path} returned status=false: ${json.transaction_state}`);
  }

  return json.data ?? [];
}

function fetchEndpoint<T>(
  path: string,
  params: Record<string, string | number> = {},
): Promise<T[]> {
  return withRetry(() => fetchEndpointOnce<T>(path, params), `DiscoverSnoop ${path}`);
}

export function fetchLiveEntities(): Promise<DiscoverEntity[]> {
  return fetchEndpoint<DiscoverEntity>('/liveentities', { country, hours, lines });
}

export function fetchLiveCategories(): Promise<DiscoverCategory[]> {
  return fetchEndpoint<DiscoverCategory>('/livecategories', { country, hours, lines });
}

export function fetchLivePages(): Promise<DiscoverPage[]> {
  return fetchEndpoint<DiscoverPage>('/livepages', { country, hours, lines });
}

export function fetchLiveDomains(): Promise<DiscoverDomain[]> {
  return fetchEndpoint<DiscoverDomain>('/livedomains', { country, hours, lines });
}

export function fetchLiveSocial(): Promise<DiscoverSocial[]> {
  return fetchEndpoint<DiscoverSocial>('/livesocial', { country, hours, lines });
}

export function fetchCategoriesList(): Promise<CategoryListItem[]> {
  return fetchEndpoint<CategoryListItem>('/categories_list');
}
