import { updateState, saveState, loadState, getState } from '../state/store.js';

/**
 * Search Profiles tracker (Google, junio 2026).
 * https://blog.google/products/search/search-profiles/
 *
 * Publishers y creadores pueden tener un Search Profile en Google.
 * Los usuarios pueden seguirlos → aumenta probabilidad de aparecer en
 * Google Discover. Es una señal editorial nueva de identidad de marca.
 *
 * Detección heurística (sin API oficial): hacemos una search a
 * google.com/search?q="[publisher]"+news y buscamos en el HTML del
 * knowledge panel señales de Search Profile.
 *
 * Cadencia: semanal (los perfiles no cambian a diario). Runtime GH Actions
 * puede recibir 429 si consultamos demasiado → 2s throttle entre lookups.
 *
 * Almacena en state.searchProfiles = {
 *   [domain]: {
 *     domain, publisherName, checkedAt,
 *     detected: boolean,
 *     signals: string[],  // qué señales encontramos
 *   }
 * }
 */

interface SearchProfileResult {
  domain: string;
  publisherName: string;
  checkedAt: string;
  detected: boolean;
  signals: string[];
  error?: string;
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function checkSearchProfile(publisherName: string, domain: string): Promise<SearchProfileResult> {
  const q = `"${publisherName}" news`;
  const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&hl=es&gl=es`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12_000);
  const base: SearchProfileResult = {
    domain, publisherName, checkedAt: new Date().toISOString(),
    detected: false, signals: [],
  };
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'user-agent': UA,
        'accept': 'text/html',
        'accept-language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });
    if (!r.ok) return { ...base, error: `HTTP ${r.status}` };
    const html = await r.text();
    const signals: string[] = [];
    // Señales heurísticas en HTML de resultados Google:
    if (/search\s*profile/i.test(html)) signals.push('literal "search profile"');
    if (/perfil\s*de\s*b[uú]squeda/i.test(html)) signals.push('literal "perfil de búsqueda"');
    // Knowledge panel del publisher con follow button
    if (/data-attrid="[^"]*follow[^"]*"/i.test(html)) signals.push('follow control (KP)');
    if (/Follow\s+for\s+updates/i.test(html)) signals.push('follow for updates');
    if (/Seguir\s+para\s+recibir/i.test(html)) signals.push('seguir para recibir');
    // Presencia de link /profile/ o /publisher/ (rutas típicas)
    if (new RegExp(`/(?:profile|publisher)/[a-z0-9-]*${domain.split('.')[0]}`, 'i').test(html)) {
      signals.push('URL publisher profile');
    }
    // Knowledge panel con el domain como topic
    if (new RegExp(`kp-blk[^"]*"[^>]*>[^<]*${domain}`, 'i').test(html) ||
        new RegExp(`data-attrid="kc:/[^"]*${domain.split('.')[0]}"`, 'i').test(html)) {
      signals.push('knowledge panel presente');
    }
    return { ...base, detected: signals.length > 0, signals };
  } catch (err: any) {
    return { ...base, error: err.message || 'fetch failed' };
  } finally {
    clearTimeout(t);
  }
}

const KNOWN_PUBLISHERS: Array<{ name: string; domain: string }> = [
  { name: 'Mundo Deportivo', domain: 'mundodeportivo.com' },
  { name: 'Marca', domain: 'marca.com' },
  { name: 'AS', domain: 'as.com' },
  { name: 'Sport', domain: 'sport.es' },
  { name: 'Estadio Deportivo', domain: 'estadiodeportivo.com' },
  { name: 'El País', domain: 'elpais.com' },
  { name: 'El Mundo', domain: 'elmundo.es' },
  { name: 'ABC', domain: 'abc.es' },
  { name: 'La Vanguardia', domain: 'lavanguardia.com' },
  { name: 'El Español', domain: 'elespanol.com' },
  { name: 'El Confidencial', domain: 'elconfidencial.com' },
  { name: 'OK Diario', domain: 'okdiario.com' },
  { name: '20 Minutos', domain: '20minutos.es' },
  { name: 'La Razón', domain: 'larazon.es' },
  { name: 'eldiario.es', domain: 'eldiario.es' },
  // Motor
  { name: 'Motor.es', domain: 'motor.es' },
  { name: 'Motorpasión', domain: 'motorpasion.com' },
  { name: 'Diariomotor', domain: 'diariomotor.com' },
];

export async function runSearchProfilesPoll(): Promise<void> {
  await loadState();
  console.log('[search-profiles] Starting weekly check...');
  const state = getState() as any;
  const prev = state.searchProfiles || {};
  const next: Record<string, SearchProfileResult> = { ...prev };

  let detected = 0;
  let errored = 0;
  for (const p of KNOWN_PUBLISHERS) {
    const res = await checkSearchProfile(p.name, p.domain);
    next[p.domain] = res;
    if (res.error) errored++;
    else if (res.detected) detected++;
    console.log(`  ${res.detected ? '✓' : '·'} ${p.domain}: ${res.signals.join(' · ') || (res.error || 'no signals')}`);
    // Throttle: 2s entre queries para evitar 429
    await new Promise(res => setTimeout(res, 2000));
  }

  console.log(`[search-profiles] Done: ${detected} detected, ${errored} errored, ${KNOWN_PUBLISHERS.length} total`);
  updateState({
    searchProfiles: next,
    lastPollSearchProfiles: new Date().toISOString(),
  } as any);
  try { await saveState(); } catch (err) { console.error('[search-profiles] saveState:', err); }
}
