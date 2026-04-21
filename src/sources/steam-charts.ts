/**
 * Steam — Top games más jugados (24h)
 * Fuente oficial: Steam Web API GetMostPlayedGames (JSON, sin key).
 * El appid se resuelve contra la Store API pública para obtener nombre + imagen.
 * Cacheamos lookups en state.steamNameCache implícitamente.
 */

export interface SteamGameItem {
  rank: number;
  appid: number;
  name: string;
  peakInGame: number;
  previousRank?: number;
  headerImage?: string;
  url?: string;
}

const CHARTS_URL =
  'https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/?key=&format=json';

async function fetchJson(url: string): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10_000);
  const r = await fetch(url, {
    signal: ctrl.signal,
    headers: { 'user-agent': 'Mozilla/5.0 discover-alerts-steam' },
  });
  clearTimeout(t);
  if (!r.ok) throw new Error(`Steam HTTP ${r.status}`);
  return r.json();
}

/** Lookup nombre via Store API. Barato (JSON ~2KB). */
async function fetchAppName(appid: number): Promise<{ name: string; headerImage?: string } | null> {
  try {
    const r = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}&filters=basic&l=spanish`, {
      headers: { 'user-agent': 'Mozilla/5.0' },
    });
    if (!r.ok) return null;
    const j = await r.json();
    const data = j?.[String(appid)]?.data;
    if (!data?.name) return null;
    return { name: data.name, headerImage: data.header_image };
  } catch { return null; }
}

export async function fetchSteamTopPlayed(limit = 15): Promise<SteamGameItem[]> {
  const data = await fetchJson(CHARTS_URL);
  const ranks = (data?.response?.ranks || []) as Array<{ rank: number; appid: number; last_week_rank?: number; peak_in_game?: number }>;
  const top = ranks.slice(0, limit);

  // Lookup paralelo (max 15 request Store)
  const names = await Promise.allSettled(top.map(r => fetchAppName(r.appid)));

  const out: SteamGameItem[] = top.map((r, i) => {
    const nm = names[i].status === 'fulfilled' ? (names[i] as PromiseFulfilledResult<any>).value : null;
    return {
      rank: r.rank,
      appid: r.appid,
      name: nm?.name || `App ${r.appid}`,
      peakInGame: r.peak_in_game || 0,
      previousRank: r.last_week_rank,
      headerImage: nm?.headerImage,
      url: `https://store.steampowered.com/app/${r.appid}/`,
    };
  });
  return out;
}
