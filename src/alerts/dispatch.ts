import { formatAlerts } from './formatter.js';
import { sendBatch } from './slack.js';
import { routeAlerts } from './router.js';
import type { Alert } from '../types.js';

/**
 * Routes a batch of alerts through the router, groups by webhook,
 * formats them, and sends via Slack. Logs the routing distribution.
 */
export async function dispatchAlerts(
  alerts: Alert[],
  pollName: string,
): Promise<void> {
  if (alerts.length === 0) return;

  const routed = await routeAlerts(alerts);

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
