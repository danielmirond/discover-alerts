import { fetchGoogleTrends, fetchGoogleTrendsUS } from '../sources/google-trends.js';
import { detectNewTrends, detectTrendsCorrelations } from '../analysis/trends-correlator.js';
import { detectOwnMediaInTrends } from '../analysis/own-media-detector.js';
import { detectStaleData } from '../analysis/insights-detector.js';
import { dedup } from '../analysis/dedup.js';
import { dispatchAlerts } from '../alerts/dispatch.js';
import { getState, updateState, saveState } from '../state/store.js';
import type { Alert, TrendSnapshotWithNews } from '../types.js';

export async function runTrendsPoll(): Promise<void> {
  console.log('[trends] Starting poll...');

  const isColdStart = getState().lastPollTrends === null;
  if (isColdStart) {
    console.log('[trends] Cold start detected — will seed state without sending alerts');
  }

  // Fetch ES (primary) and US (secondary, best-effort) in parallel
  const usEnabled = process.env.TRENDS_US_ENABLED !== 'false';
  const [trendsES, trendsUSResult] = await Promise.allSettled([
    fetchGoogleTrends('ES'),
    usEnabled ? fetchGoogleTrendsUS() : Promise.resolve([] as Awaited<ReturnType<typeof fetchGoogleTrendsUS>>),
  ]);
  const trends = trendsES.status === 'fulfilled' ? trendsES.value : [];
  const trendsUS = trendsUSResult.status === 'fulfilled' ? trendsUSResult.value : [];
  if (trendsES.status === 'rejected') console.error('[trends] ES error:', trendsES.reason);
  if (usEnabled && trendsUSResult.status === 'rejected') console.error('[trends] US error:', trendsUSResult.reason);
  console.log(`[trends] Fetched ES=${trends.length} US=${trendsUS.length}`);

  // Persist US trends (with newsItems so dashboard can show examples).
  // NO alerts for US — only surfaced in the dashboard "Huecos activos" panel
  // when they have editorial "cabida" (match ES entity, ES media, or topic).
  if (trendsUS.length > 0) {
    const nowIso = new Date().toISOString();
    const prevUS = getState().trendsUS || {};
    const nextUS: Record<string, TrendSnapshotWithNews> = {};
    for (const t of trendsUS) {
      const prior = prevUS[t.title];
      nextUS[t.title] = {
        approxTraffic: t.approxTraffic,
        firstSeen: prior?.firstSeen ?? nowIso,
        lastUpdated: nowIso,
        newsItems: t.newsItems.slice(0, 3).map(n => ({
          title: n.title,
          url: n.url,
          source: n.source,
        })),
        geo: 'US',
      };
    }
    updateState({ trendsUS: nextUS });
  }

  const alerts: Alert[] = [];

  // Detect new topics
  alerts.push(...detectNewTrends(trends));

  // Own-media in Google Trends news items
  alerts.push(...detectOwnMediaInTrends(trends));

  // Health-check: otros pollers inactivos
  alerts.push(...detectStaleData('trends'));

  // Cross-reference with cached Discover data
  const state = getState();
  const cachedEntities = Object.entries(state.entities).map(([entityName, snap]) => ({
    entity: entityName,
    country: 'ES',
    score: snap.score,
    score_decimal: snap.scoreDecimal,
    position: snap.position,
    publications: snap.publications,
  }));
  const cachedPages = Object.entries(state.pages).map(([url, snap]) => ({
    url,
    title: snap.title,
    score: snap.score,
    position: snap.position,
  }));

  if (cachedEntities.length > 0 || cachedPages.length > 0) {
    alerts.push(...detectTrendsCorrelations(trends, cachedEntities, cachedPages));
  }

  if (isColdStart) {
    console.log(`[trends] Cold start: generated ${alerts.length} alerts but suppressing them`);
  } else {
    // Dedup, route and send
    const filtered = dedup(alerts);
    if (filtered.length > 0) {
      console.log(`[trends] Sending ${filtered.length} alerts`);
      await dispatchAlerts(filtered, 'trends');
    } else {
      console.log(`[trends] No new alerts`);
    }
  }

  updateState({ lastPollTrends: new Date().toISOString() });
  await saveState();
  console.log('[trends] Poll complete');
}
