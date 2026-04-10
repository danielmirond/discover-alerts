import { formatAlerts } from './formatter.js';
import { sendBatch } from './slack.js';
import { routeAlerts } from './router.js';
import type { Alert } from '../types.js';

const MAX_ALERTS_PER_POLL = parseInt(process.env.MAX_ALERTS_PER_POLL || '10', 10);

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
        case 'spike': return 80;
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

  // Send per webhook
  for (const [webhookUrl, webhookAlerts] of byWebhook) {
    const messages = formatAlerts(webhookAlerts).map(payload => ({ payload, webhookUrl }));
    await sendBatch(messages);
  }
}
