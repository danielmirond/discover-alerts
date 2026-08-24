import { loadState } from './state/store.js';
import { runDiscoverPoll } from './polling/discover-poll.js';
import { runTrendsPoll } from './polling/trends-poll.js';
import { runMediaPoll } from './polling/media-poll.js';
import { runBoePoll } from './polling/boe-poll.js';
import { runXPoll } from './polling/x-poll.js';
import { runMeneamePoll } from './polling/meneame-poll.js';
import { runWikipediaPoll } from './polling/wikipedia-poll.js';
import { runCulturalPoll } from './polling/cultural-poll.js';
import { runAemetPoll } from './polling/aemet-poll.js';
import { runInternationalPoll } from './polling/international-poll.js';
import { runHistoricalPatternsPoll } from './polling/historical-patterns-poll.js';
import { runWikidataPoll } from './polling/wikidata-poll.js';
import { runContentAuditPoll } from './polling/content-audit-poll.js';
import { runSearchProfilesPoll } from './polling/search-profiles-poll.js';

const target = process.argv[2]; // discover | trends | media | boe | x | meneame | wikipedia | cultural | aemet | all

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
      case 'cultural':
        await runCulturalPoll();
        break;
      case 'aemet':
        await runAemetPoll();
        break;
      case 'international':
        await runInternationalPoll();
        break;
      case 'historical-patterns':
        await runHistoricalPatternsPoll();
        break;
      case 'wikidata':
        await runWikidataPoll();
        break;
      case 'content-audit':
        await runContentAuditPoll();
        break;
      case 'search-profiles':
        await runSearchProfilesPoll();
        break;
      case 'all':
        await runDiscoverPoll();
        await runTrendsPoll();
        await runMediaPoll();
        await runBoePoll();
        await runXPoll();
        await runMeneamePoll();
        await runWikipediaPoll();
        await runCulturalPoll();
        await runAemetPoll();
        break;
      default:
        console.error(`Usage: run-poll.ts <discover|trends|media|boe|x|meneame|wikipedia|cultural|aemet|all>`);
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
