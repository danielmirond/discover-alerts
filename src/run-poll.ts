// Standalone script for GitHub Actions: runs one poll cycle and exits
import { loadState } from './state/store.js';
import { runDiscoverPoll } from './polling/discover-poll.js';
import { runTrendsPoll } from './polling/trends-poll.js';
import { runMediaPoll } from './polling/media-poll.js';

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
      console.error(`Usage: run-poll.ts <discover|trends|media|all>`);
      process.exit(1);
  }

  console.log(`[run-poll] ${target} completed`);
}

main().catch(err => {
  console.error('[run-poll] Fatal:', err);
  process.exit(1);
});
