/**
 * Netflix Top 10 ES — parsea el TSV oficial público de Netflix Tudum.
 * Fuente: https://www.netflix.com/tudum/top10/data/all-weeks-countries.tsv (~29MB)
 * Actualizado semanalmente (martes). Sin auth.
 */

export interface NetflixTopItem {
  rank: number;
  category: 'Films' | 'TV' | string;
  title: string;
  seasonTitle?: string;
  cumulativeWeeks: number;
  week: string; // YYYY-MM-DD (fin de semana)
}

const SOURCE_URL = 'https://www.netflix.com/tudum/top10/data/all-weeks-countries.tsv';

export async function fetchNetflixTopES(): Promise<NetflixTopItem[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 60_000);
  const r = await fetch(SOURCE_URL, {
    signal: ctrl.signal,
    redirect: 'follow',
    headers: { 'user-agent': 'Mozilla/5.0 discover-alerts-netflix' },
  });
  clearTimeout(t);
  if (!r.ok) throw new Error(`Netflix TSV HTTP ${r.status}`);
  const text = await r.text();

  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].split('\t');
  const col = (name: string) => header.indexOf(name);
  const iCountry = col('country_iso2');
  const iWeek = col('week');
  const iCategory = col('category');
  const iRank = col('weekly_rank');
  const iTitle = col('show_title');
  const iSeason = col('season_title');
  const iCum = col('cumulative_weeks_in_top_10');

  if ([iCountry, iWeek, iCategory, iRank, iTitle].some(i => i < 0)) {
    throw new Error('Netflix TSV header mismatch');
  }

  // Filtrar ES + última semana presente para ES
  let latestWeek = '';
  const esRows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = line.split('\t');
    if (cols[iCountry] !== 'ES') continue;
    if (cols[iWeek] > latestWeek) latestWeek = cols[iWeek];
    esRows.push(cols);
  }

  const currentWeek = esRows
    .filter(c => c[iWeek] === latestWeek)
    .map<NetflixTopItem>(c => ({
      rank: parseInt(c[iRank], 10) || 999,
      category: c[iCategory] || 'Films',
      title: c[iTitle] || '',
      seasonTitle: iSeason >= 0 && c[iSeason] && c[iSeason] !== 'N/A' ? c[iSeason] : undefined,
      cumulativeWeeks: iCum >= 0 ? parseInt(c[iCum], 10) || 0 : 0,
      week: c[iWeek] || latestWeek,
    }))
    .sort((a, b) => a.rank - b.rank);

  return currentWeek;
}
