import { config } from '../config.js';

// Rate limiting disabled: messages are sent as fast as Slack accepts them.
// Slack webhooks tolerate short bursts; if we hit 429 we'll see it in logs.

export async function sendToSlack(
  payload: object,
  webhookUrl?: string,
): Promise<void> {
  const url = webhookUrl ?? config.slack.webhookUrl;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

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
  // Fire all requests in parallel — no rate limit between them
  await Promise.allSettled(
    messages.map(msg =>
      ('payload' in msg && 'webhookUrl' in msg)
        ? sendToSlack(msg.payload, msg.webhookUrl)
        : sendToSlack(msg),
    ),
  ).then(results => {
    for (const r of results) {
      if (r.status === 'rejected') {
        console.error('[slack] Error sending message:', r.reason);
      }
    }
  });
}
