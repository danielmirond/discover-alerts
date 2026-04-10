import { config } from '../config.js';

// Per-webhook rate limit: 1 message per second per webhook
const RATE_LIMIT_MS = 1000;
const lastSentByWebhook = new Map<string, number>();

async function waitForRateLimit(webhookUrl: string): Promise<void> {
  const lastSent = lastSentByWebhook.get(webhookUrl) ?? 0;
  const elapsed = Date.now() - lastSent;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
}

export async function sendToSlack(
  payload: object,
  webhookUrl?: string,
): Promise<void> {
  const url = webhookUrl ?? config.slack.webhookUrl;
  await waitForRateLimit(url);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  lastSentByWebhook.set(url, Date.now());

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Slack webhook ${res.status}: ${text}`);
  }
}

export interface WebhookMessage {
  payload: object;
  webhookUrl: string;
}

export async function sendBatch(messages: (object | WebhookMessage)[]): Promise<void> {
  for (const msg of messages) {
    try {
      if ('payload' in msg && 'webhookUrl' in msg) {
        await sendToSlack(msg.payload, msg.webhookUrl);
      } else {
        await sendToSlack(msg);
      }
    } catch (err) {
      console.error('[slack] Error sending message:', err);
    }
  }
}
