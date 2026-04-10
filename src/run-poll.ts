async function main() {
  try {
    await loadState();
  } catch (err) {
    console.error('[run-poll] loadState error:', err);
    // seguimos sin estado, no es crítico
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
      case 'x':
        await runXPoll();
        break;
      case 'all':
        await runDiscoverPoll();
        await runTrendsPoll();
        await runMediaPoll();
        await runXPoll();
        break;
      default:
        console.error(`Usage: run-poll.ts <discover|trends|media|x|all>`);
        return;
    }
  } catch (err) {
    console.error('[run-poll] poll error:', err);
  }

  console.log(`[run-poll] ${target} completed`);
}

main().catch(err => {
  console.error('[run-poll] Fatal (unexpected):', err);
});
