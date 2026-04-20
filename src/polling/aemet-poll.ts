import { updateState, saveState, loadState } from '../state/store.js';
import { fetchAemetAvisos } from '../sources/aemet.js';

/**
 * Poll AEMET (sin API key por ahora, scraping). Cadencia sugerida: 30min.
 * No genera alertas — persiste avisos para dashboard + futura correlación.
 */
export async function runAemetPoll(): Promise<void> {
  await loadState();
  console.log('[aemet] Starting poll...');
  try {
    const avisos = await fetchAemetAvisos();
    console.log(`[aemet] ${avisos.length} avisos parsed`);
    updateState({
      lastPollAemet: new Date().toISOString(),
      aemetAvisos: avisos,
    });
    try { await saveState(); } catch (err) { console.error('[aemet] saveState:', err); }
    console.log('[aemet] Poll complete');
  } catch (err) {
    console.error('[aemet] fatal:', err);
  }
}
