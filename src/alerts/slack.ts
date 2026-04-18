import { config } from '../config.js';
import { logger, getErrorMessage } from '../utils/logger.js';

const RATE_LIMIT_MS = 1000;
let lastSent = 0;

async function waitForRateLimit(): Promise<void> {
  const elapsed = Date.now() - lastSent;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
}

export async function sendToSlack(payload: object): Promise<void> {
  await waitForRateLimit();

  const res = await fetch(config.slack.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  lastSent = Date.now();

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Slack webhook ${res.status}: ${text}`);
  }
}

export async function sendBatch(messages: object[]): Promise<void> {
  for (const msg of messages) {
    try {
      await sendToSlack(msg);
    } catch (err) {
      logger.error('[slack] Error sending message', { error: getErrorMessage(err) });
    }
  }
}
