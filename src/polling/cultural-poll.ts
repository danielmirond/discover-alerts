import { getState, updateState, saveState, loadState } from '../state/store.js';
import { fetchNetflixTopES } from '../sources/netflix.js';
import { fetchFlixPatrolMulti } from '../sources/flixpatrol.js';

/**
 * Poll semanal-ish de fuentes culturales (Netflix Top 10 ES + FlixPatrol ES).
 * No genera alertas por ahora — solo persiste el dato para el dashboard.
 */
export async function runCulturalPoll(): Promise<void> {
  await loadState();
  console.log('[cultural] Starting poll...');

  const [nf, fp] = await Promise.allSettled([
    fetchNetflixTopES(),
    fetchFlixPatrolMulti(),
  ]);

  const netflix = nf.status === 'fulfilled' ? nf.value : [];
  const flixpatrol = fp.status === 'fulfilled' ? fp.value : [];

  if (nf.status === 'rejected') console.error('[cultural] Netflix error:', nf.reason);
  if (fp.status === 'rejected') console.error('[cultural] FlixPatrol error:', fp.reason);

  // Contar por (platform, country)
  const byTarget = new Map<string, number>();
  for (const f of flixpatrol) {
    const k = `${f.platform}/${f.country}`;
    byTarget.set(k, (byTarget.get(k) || 0) + 1);
  }
  console.log(`[cultural] Netflix TSV ES: ${netflix.length} items`);
  console.log(`[cultural] FlixPatrol: ${flixpatrol.length} items across ${byTarget.size} targets`);
  for (const [k, n] of byTarget) console.log(`  · ${k}: ${n}`);

  updateState({
    lastPollCultural: new Date().toISOString(),
    netflixTop: netflix,
    flixpatrolTop: flixpatrol,
  });

  try { await saveState(); } catch (err) { console.error('[cultural] saveState:', err); }
  console.log('[cultural] Poll complete');
}
