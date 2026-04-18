import { formatAlerts } from './formatter.js';
import { sendBatch } from './slack.js';
import { routeAlerts } from './router.js';
import { getState, updateState } from '../state/store.js';
import type { Alert } from '../types.js';

const MAX_ALERTS_PER_POLL = parseInt(process.env.MAX_ALERTS_PER_POLL || '10', 10);
const RECENT_ALERTS_MAX = 200;
const RECENT_ALERTS_RETENTION_HOURS = 6;

/**
 * Priority ranking: higher number = higher priority (sent first if over cap).
 *
 * Ordering rationale:
 *  - flash (1h) = breaking news RIGHT NOW
 *  - triple concordance (Discover + Trends + X) = exceptional signal
 *  - spike (2h) = very hot
 *  - entity_coverage = medios publicando mucho
 *  - day_spike category = categoria disparada hoy
 *  - double concordance = 2 sources
 *  - ascending (6h) = sostenido
 *  - rising = score jump
 *  - category spike poll-over-poll
 *  - headline pattern / trends correlation / new topic
 */
function alertPriority(alert: Alert): number {
  switch (alert.type) {
    case 'entity':
      switch (alert.subtype) {
        case 'flash': return 100;
        case 'discover_1h': return 98;
        case 'discover_3h': return 82;
        case 'longtail': return 80;
        case 'spike': return 80;
        case 'discover_12h': return 55;
        case 'ascending': return 50;
        case 'rising': return 40;
        case 'new': return 10;
      }
      return 0;
    case 'entity_concordance':
      switch (alert.subtype) {
        case 'discover_trends_x': return 95;
        case 'discover_rss': return 70;
        case 'discover_trends': return 60;
        case 'discover_x': return 55;
      }
      return 0;
    case 'triple_match': return 99; // Highest priority: Discover+Trends+X with thresholds met
    case 'first_mover': return 87; // Exclusive by one outlet in 30min — act or skip fast
    case 'wikipedia_surge': return 86; // Breaking: article being edited heavily right now
    case 'meneame_hot': return 84; // Viral upstream before Discover
    case 'own_media': return 92; // Own media highly important
    case 'own_media_absent': return 88; // You're missing the story
    case 'headline_cluster': return 90; // Big event signal
    case 'stale_data': return 85; // Health
    case 'trends_without_discover': return 72; // SEO opportunity
    case 'multi_entity_article': return 68; // Content mentioning 2+ entities
    case 'entity_coverage': return 75;
    case 'category':
      return alert.subtype === 'day_spike' ? 65 : 45;
    case 'trends_correlation': return 35;
    case 'headline_pattern': return 30;
    case 'trends_new_topic': return 20;
  }
}

function alertScore(alert: Alert): number {
  switch (alert.type) {
    case 'entity':
    case 'entity_concordance':
    case 'triple_match':
    case 'entity_coverage':
      return (alert as any).score ?? (alert as any).coverageCount ?? 0;
    case 'category':
      return alert.score;
    default: return 0;
  }
}

/**
 * Routes a batch of alerts through the router, caps at MAX_ALERTS_PER_POLL
 * with priority ranking, groups by webhook, formats them, and sends via Slack.
 */
export async function dispatchAlerts(
  alerts: Alert[],
  pollName: string,
): Promise<void> {
  if (alerts.length === 0) return;

  const originalCount = alerts.length;

  // Sort by (priority DESC, score DESC) and cap
  const sorted = [...alerts].sort((a, b) => {
    const pDiff = alertPriority(b) - alertPriority(a);
    if (pDiff !== 0) return pDiff;
    return alertScore(b) - alertScore(a);
  });

  const capped = sorted.slice(0, MAX_ALERTS_PER_POLL);
  if (capped.length < originalCount) {
    console.log(
      `[${pollName}] Capped ${originalCount} alerts → ${capped.length} (max=${MAX_ALERTS_PER_POLL})`,
    );
  }

  const routed = await routeAlerts(capped);

  // Group alerts by webhook URL
  const byWebhook = new Map<string, Alert[]>();
  for (const r of routed) {
    if (!byWebhook.has(r.webhookUrl)) byWebhook.set(r.webhookUrl, []);
    byWebhook.get(r.webhookUrl)!.push(r.alert);
  }

  // Log routing distribution
  const routeCounts: Record<string, number> = {};
  for (const r of routed) routeCounts[r.routeName] = (routeCounts[r.routeName] ?? 0) + 1;
  console.log(`[${pollName}] Routing: ${JSON.stringify(routeCounts)}`);

  // Persist to state.recentAlerts (for dashboard display)
  const now = new Date().toISOString();
  const nowMs = Date.now();
  const retentionMs = RECENT_ALERTS_RETENTION_HOURS * 3600_000;
  const state = getState();
  const previous = (state.recentAlerts ?? []).filter(
    r => nowMs - new Date(r.timestamp).getTime() <= retentionMs,
  );
  const newEntries = routed.map(r => ({
    alert: r.alert,
    timestamp: now,
    routeName: r.routeName,
  }));
  const combined = [...newEntries, ...previous].slice(0, RECENT_ALERTS_MAX);
  updateState({ recentAlerts: combined });

  // Send per webhook
  for (const [webhookUrl, webhookAlerts] of byWebhook) {
    const formatted = await formatAlerts(webhookAlerts);
    const messages = formatted.map(payload => ({ payload, webhookUrl }));
    await sendBatch(messages);
  }
}
