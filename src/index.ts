import { loadState, saveState } from './state/store.js';
import { sendToSlack } from './alerts/slack.js';
import { formatHeartbeat } from './alerts/formatter.js';
import { startPolling } from './polling/scheduler.js';

async function main(): Promise<void> {
  console.log('Discover Alerts starting...');

  // Load persisted state
  await loadState();

  // Send heartbeat to Slack
  try {
    await sendToSlack(formatHeartbeat());
    console.log('[main] Heartbeat sent to Slack');
  } catch (err) {
    console.error('[main] Failed to send heartbeat:', err);
  }

  // Start polling loops
  const { stop } = startPolling();

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n[main] Shutting down...');
    stop();
    await saveState();
    console.log('[main] State saved. Goodbye!');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch(err => {
  console.error('[main] Fatal error:', err);
  process.exit(1);
});
