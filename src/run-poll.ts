// Standalone script for GitHub Actions: runs one poll cycle and exits
import { loadState } from './state/store.js';
import { runDiscoverPoll } from './polling/discover-poll.js';
import { runTrendsPoll } from './polling/trends-poll.js';
import { runMediaPoll } from './polling/media-poll.js';
import { logger } from './utils/logger.js';

const target = process.argv[2]; // 'discover' | 'trends' | 'media' | 'all'

async function main() {
  await loadState();

  switch (target) {
    case 'discover':
      await runDiscoverPoll();
      break;
    case 'trends':
      await runTrendsPoll();
      break;
    case 'media':
      await runMediaPoll();
      break;
    case 'all':
      await runDiscoverPoll();
      await runTrendsPoll();
      await runMediaPoll();
      break;
    default:
      logger.error(`Usage: run-poll.ts <discover|trends|media|all>`);
      process.exit(1);
  }

  logger.info(`[run-poll] ${target} completed`);
}

main().catch(err => {
  logger.error('[run-poll] Fatal', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
