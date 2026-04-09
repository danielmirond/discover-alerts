import { loadState, saveState } from './state/store.js';
import { sendToSlack } from './alerts/slack.js';
import { formatHeartbeat } from './alerts/formatter.js';
import { startPolling } from './polling/scheduler.js';
import { logger } from './utils/logger.js';
import { validateSlackWebhookUrl } from './utils/validate.js';
import { config } from './config.js';

async function main(): Promise<void> {
  logger.info('Discover Alerts starting...');

  // Validate config early
  validateSlackWebhookUrl(config.slack.webhookUrl);

  // Load persisted state
  await loadState();

  // Send heartbeat to Slack
  try {
    await sendToSlack(formatHeartbeat());
    logger.info('[main] Heartbeat sent to Slack');
  } catch (err) {
    logger.error('[main] Failed to send heartbeat', { error: err instanceof Error ? err.message : String(err) });
  }

  // Start polling loops
  const { stop } = startPolling();

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('[main] Shutting down...');
    stop();
    await saveState();
    logger.info('[main] State saved. Goodbye!');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch(err => {
  logger.error('[main] Fatal error', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
