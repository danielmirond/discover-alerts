import { updateState, saveState, loadState, getState } from '../state/store.js';
import { fetchLiveEntities, fetchLivePages, fetchCategoriesList } from '../sources/discoversnoop.js';
import type { DiscoverEntity, DiscoverPage } from '../types.js';

/** Tracking persistente de pages internacionales: vida en el feed para el
 * Ranking Audience. Una page entra en este map la primera vez que la vemos
 * en cualquier poll y se mantiene actualizada hasta que desaparece del feed
 * y supera la ventana de retención. */
export interface InternationalTrackedPage {
  country: string;
  url: string;
  title: string;
  image?: string;
  domain?: string;
  publisher?: string;
  category?: string;
  /** Score más alto observado durante su vida en el feed. */
  maxScore: number;
  /** Score actual (último poll donde aún aparecía). */
  lastScore: number;
  /** Score medio. */
  avgScore: number;
  /** Posición más alta (mejor) observada. */
  bestPosition: number;
  /** Polls en los que ha aparecido. */
  pollsSeen: number;
  firstSeen: string;
  lastSeen: string;
  /** Sigue presente en el último poll. */
  active: boolean;
}

/**
 * Poll DiscoverSnoop para varios países, filtrando por categoría /Sports.
 *
 * Pensado para la instancia sport: traer top trending DEPORTIVO en USA, UK,
 * MEXICO, ARGENTINA, ITALIA. Permite ver con qué se está enganchando el
 * mundo deportivo internacional y anticipar cobertura ES (golf US, F1 UK,
 * NBA US, fútbol MX/AR, Serie A IT…).
 *
 * Cadencia recomendada: cada 30-60 min (5 países × 2 endpoints = 10 calls).
 */

export interface InternationalCountrySnap {
  country: string;
  fetchedAt: string;
  entities: Array<{ name: string; score: number; position: number; publications: number; category?: string }>;
  pages: Array<{ url: string; title: string; image?: string; score: number; position?: number; domain?: string; publisher?: string; category?: string | number }>;
}

const COUNTRIES = [
  { code: 'US', label: 'USA' },
  { code: 'GB', label: 'UK' },
  { code: 'IT', label: 'Italia' },
  { code: 'FR', label: 'Francia' },
  { code: 'DE', label: 'Alemania' },
  { code: 'PT', label: 'Portugal' },
  { code: 'MX', label: 'México' },
  { code: 'AR', label: 'Argentina' },
  { code: 'CO', label: 'Colombia' },
  { code: 'CL', label: 'Chile' },
  { code: 'BR', label: 'Brasil' },
  { code: 'JP', label: 'Japón' },
  { code: 'KR', label: 'Corea Sur' },
];

/** Categorías que consideramos deportivas (case-insensitive prefix match).
 * Algunos países (US, BR, JP) clasifican deporte bajo /News/Sports en DS. */
const SPORT_PREFIXES = ['/sports', '/news/sports'];

let categoryNamesCache: Record<number, string> | null = null;
async function getCategoryNames(): Promise<Record<number, string>> {
  if (categoryNamesCache) return categoryNamesCache;
  try {
    const list = await fetchCategoriesList();
    const map: Record<number, string> = {};
    for (const c of list as any[]) {
      if (c?.id != null && c?.name) map[c.id] = c.name;
    }
    categoryNamesCache = map;
    return map;
  } catch (err) {
    console.warn('[intl] categories list failed:', (err as Error).message);
    return {};
  }
}

function isSportCategory(c: string | number | undefined, names: Record<number, string>): boolean {
  if (c == null) return false;
  const name = typeof c === 'number' ? names[c] : c;
  if (!name) return false;
  const lower = name.toLowerCase();
  return SPORT_PREFIXES.some(p => lower.startsWith(p));
}

async function fetchOne(code: string, names: Record<number, string>): Promise<InternationalCountrySnap | null> {
  try {
    const [ent, pag] = await Promise.allSettled([
      fetchLiveEntities(code),
      fetchLivePages(code),
    ]);
    const allEnts = ent.status === 'fulfilled' ? (ent.value as DiscoverEntity[]) : [];
    const allPages = pag.status === 'fulfilled' ? (pag.value as DiscoverPage[]) : [];

    // Filtrar pages a /Sports
    const sportPages = allPages.filter(p => isSportCategory(p.category, names));
    // Entities permitidas: las que aparecen en sportPages
    const allowedNames = new Set<string>();
    for (const p of sportPages) {
      const raw = (p.entities as unknown as any[]) || [];
      for (const e of raw) {
        const n = typeof e === 'string' ? e : (e?.entity || e?.name);
        if (n) allowedNames.add(n);
      }
    }
    const sportEntities = allEnts.filter(e => allowedNames.has(e.entity));

    return {
      country: code,
      fetchedAt: new Date().toISOString(),
      entities: sportEntities.slice(0, 30).map(e => ({
        name: e.entity,
        score: e.score,
        position: e.position,
        publications: e.publications,
      })),
      pages: sportPages.slice(0, 30).map(p => ({
        url: p.url,
        title: p.title,
        image: p.image,
        score: p.score || 0,
        position: p.position,
        domain: p.domain,
        publisher: p.publisher,
        category: typeof p.category === 'number' ? names[p.category] : p.category,
      })),
    };
  } catch (err) {
    console.error(`[intl] ${code} failed:`, (err as Error).message);
    return null;
  }
}

export async function runInternationalPoll(): Promise<void> {
  await loadState();
  console.log('[intl] Starting international sport poll...');
  const names = await getCategoryNames();
  const results = await Promise.allSettled(COUNTRIES.map(c => fetchOne(c.code, names)));
  const out: Record<string, InternationalCountrySnap> = {};
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) {
      out[COUNTRIES[i].code] = r.value;
      console.log(`[intl]   ${COUNTRIES[i].code} ${COUNTRIES[i].label}: ${r.value.entities.length} entities, ${r.value.pages.length} pages`);
    } else {
      console.warn(`[intl]   ${COUNTRIES[i].code} skipped`);
    }
  });
  // ── Tracking de vida en el feed (para Ranking Audience) ─────────────────
  const now = new Date().toISOString();
  const nowMs = Date.now();
  const RETENTION_MS = 48 * 3600_000; // 48h sin verse → se purga
  const state = getState() as any;
  const prev: Record<string, InternationalTrackedPage> = state.internationalTracking || {};
  const next: Record<string, InternationalTrackedPage> = {};

  // Pages activas en este poll
  const activeKeys = new Set<string>();
  for (const [code, snap] of Object.entries(out)) {
    for (const p of snap.pages) {
      const key = `${code}::${p.url}`;
      activeKeys.add(key);
      const existing = prev[key];
      const score = p.score || 0;
      const pos = typeof p.position === 'number' ? p.position : 999;
      if (existing) {
        const polls = existing.pollsSeen + 1;
        next[key] = {
          ...existing,
          title: p.title || existing.title,
          image: p.image || existing.image,
          domain: p.domain || existing.domain,
          publisher: p.publisher || existing.publisher,
          category: (typeof p.category === 'string' ? p.category : undefined) || existing.category,
          maxScore: Math.max(existing.maxScore, score),
          lastScore: score,
          avgScore: Math.round(((existing.avgScore * existing.pollsSeen) + score) / polls),
          bestPosition: Math.min(existing.bestPosition, pos),
          pollsSeen: polls,
          lastSeen: now,
          active: true,
        };
      } else {
        next[key] = {
          country: code,
          url: p.url,
          title: p.title || '',
          image: p.image,
          domain: p.domain,
          publisher: p.publisher,
          category: typeof p.category === 'string' ? p.category : undefined,
          maxScore: score,
          lastScore: score,
          avgScore: score,
          bestPosition: pos,
          pollsSeen: 1,
          firstSeen: now,
          lastSeen: now,
          active: true,
        };
      }
    }
  }
  // Pages que estaban tracked pero no aparecieron en este poll: mantener si no
  // han superado la retención. Marcar active=false.
  for (const [key, entry] of Object.entries(prev)) {
    if (activeKeys.has(key)) continue;
    const lastSeenMs = new Date(entry.lastSeen).getTime();
    if (nowMs - lastSeenMs > RETENTION_MS) continue;
    next[key] = { ...entry, active: false };
  }

  console.log(`[intl] tracking: ${Object.keys(next).length} pages (${Object.values(next).filter(p => p.active).length} active)`);

  updateState({
    internationalSport: out,
    internationalTracking: next,
    lastPollInternational: new Date().toISOString(),
  } as any);
  try { await saveState(); } catch (err) { console.error('[intl] saveState:', err); }
  console.log('[intl] Poll complete');
}
