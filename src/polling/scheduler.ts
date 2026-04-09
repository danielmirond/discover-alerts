import { config } from '../config.js';
import { runDiscoverPoll } from './discover-poll.js';
import { runTrendsPoll } from './trends-poll.js';
import { runMediaPoll } from './media-poll.js';

function safeRun(name: string, fn: () => Promise<void>): () => void {
  return () => {
    fn().catch(err => console.error(`[scheduler] ${name} poll failed:`, err));
  };
}

export function startPolling(): { stop: () => void } {
  console.log(
    `[scheduler] Starting polls: Discover every ${config.polling.discoverIntervalMs / 1000}s, ` +
    `Trends every ${config.polling.trendsIntervalMs / 1000}s, ` +
    `Media every ${config.polling.mediaIntervalMs / 1000}s`,
  );

  // Immediate first polls (staggered)
  const initialDiscover = setTimeout(safeRun('discover', runDiscoverPoll), 1000);
  const initialTrends = setTimeout(safeRun('trends', runTrendsPoll), 5000);
  const initialMedia = setTimeout(safeRun('media', runMediaPoll), 10000);

  // Recurring intervals
  const discoverInterval = setInterval(
    safeRun('discover', runDiscoverPoll),
    config.polling.discoverIntervalMs,
  );
  const trendsInterval = setInterval(
    safeRun('trends', runTrendsPoll),
    config.polling.trendsIntervalMs,
  );
  const mediaInterval = setInterval(
    safeRun('media', runMediaPoll),
    config.polling.mediaIntervalMs,
  );

  return {
    stop() {
      clearTimeout(initialDiscover);
      clearTimeout(initialTrends);
      clearTimeout(initialMedia);
      clearInterval(discoverInterval);
      clearInterval(trendsInterval);
      clearInterval(mediaInterval);
      console.log('[scheduler] Polling stopped');
    },
  };
}
