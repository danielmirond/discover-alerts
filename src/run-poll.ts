import { loadState } from './state/store.js';
import { runDiscoverPoll } from './polling/discover-poll.js';
import { runTrendsPoll } from './polling/trends-poll.js';
import { runMediaPoll } from './polling/media-poll.js';
import { runBoePoll } from './polling/boe-poll.js';
import { runXPoll } from './polling/x-poll.js';
import { runMeneamePoll } from './polling/meneame-poll.js';
import { runWikipediaPoll } from './polling/wikipedia-poll.js';

const target = process.argv[2]; // discover | trends | media | boe | x | meneame | wikipedia | all

async function main() {
  // 🔴 No dejar que Redis rompa el proceso
  try {
    await loadState();
  } catch (err) {
    console.error('[run-poll] loadState error:', err);
  }

  try {
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
      case 'boe':
        await runBoePoll();
        break;
      case 'x':
        await runXPoll();
        break;
      case 'meneame':
        await runMeneamePoll();
        break;
      case 'wikipedia':
        await runWikipediaPoll();
        break;
      case 'all':
        await runDiscoverPoll();
        await runTrendsPoll();
        await runMediaPoll();
        await runBoePoll();
        await runXPoll();
        await runMeneamePoll();
        await runWikipediaPoll();
        break;
      default:
        console.error(`Usage: run-poll.ts <discover|trends|media|boe|x|meneame|wikipedia|all>`);
        return;
    }
  } catch (err) {
    console.error('[run-poll] poll error:', err);
  }

  console.log(`[run-poll] ${target} completed`);
}

// ⚠️ IMPORTANTE: no hacer process.exit(1)
main().catch(err => {
  console.error('[run-poll] Fatal (unexpected):', err);
});
