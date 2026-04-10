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

const { baseUrl, token, country, hours, lines } = config.discoversnoop;

async function fetchEndpoint<T>(
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

  const rawText = await res.text();

  if (!res.ok) {
    throw new Error(`DiscoverSnoop ${path} HTTP ${res.status}: ${rawText}`);
  }

  let json: ApiResponse<T>;
  try {
    json = JSON.parse(rawText) as ApiResponse<T>;
  } catch {
    throw new Error(`DiscoverSnoop ${path} invalid JSON: ${rawText.slice(0, 500)}`);
  }

  if (!json.status) {
    console.error(`[discoversnoop] ${path} full response:`, JSON.stringify(json).slice(0, 1000));
    throw new Error(
      `DiscoverSnoop ${path} status=false | state=${json.transaction_state} | full=${JSON.stringify(json).slice(0, 300)}`,
    );
  }

  return json.data ?? [];
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
