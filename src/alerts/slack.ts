import { config } from '../config.js';

// Rate limiting disabled: messages are sent as fast as Slack accepts them.
// Slack webhooks tolerate short bursts; if we hit 429 we'll see it in logs.

/** Silencio global de Slack.
 *  Con `true` los polls siguen corriendo y alimentando state/dashboard, pero
 *  no se hace ningun POST a los webhooks. Aplica a las tres instancias
 *  (general, sport, motor) porque comparten este codigo, y tanto a los polls
 *  de GitHub Actions como a los endpoints api/cron de Vercel.
 *  Para reanudar los envios: pon `false` y despliega. */
const SLACK_MUTED: boolean = true;

/** Considera el webhook "desactivado" si:
 *  - no viene URL
 *  - es literalmente vacío
 *  - contiene los tokens 'DISABLED' o 'PLACEHOLDER' o 'CHANGE_ME'
 *  - no es una URL Slack válida (no empieza por https://hooks.slack.com/)
 * Permite parar los envíos sin romper polls: SLACK_WEBHOOK_URL=DISABLED
 * silencia la instancia sin logs de error. */
function isDisabledWebhook(url: string | undefined): boolean {
  if (!url) return true;
  const u = url.trim();
  if (u.length === 0) return true;
  if (/DISABLED|PLACEHOLDER|CHANGE_ME|about:blank/i.test(u)) return true;
  if (!u.startsWith('https://hooks.slack.com/')) return true;
  return false;
}

export async function sendToSlack(
  payload: object,
  webhookUrl?: string,
): Promise<void> {
  // Kill-switch global. Va antes de leer config para que el silencio no
  // dependa de ninguna env var.
  if (SLACK_MUTED) return;

  const url = webhookUrl ?? config.slack.webhookUrl;

  // Silencio operativo — permite deshabilitar Slack por instancia sin
  // desactivar polls. Retorna OK, ningún log de error.
  if (isDisabledWebhook(url)) return;

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
