import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadState, getState } from '../src/state/store.js';

/**
 * GET /api/fichajes
 *
 * Vista cross-source de rumores y noticias de fichajes / transfers.
 * Filtra por keywords ES/EN/IT/FR/PT/DE sobre titular + URL en:
 *  - state.mediaArticles (RSS + sitemap-news, ventana 24h)
 *  - state.pages (Discover ES /Sports vigente)
 *  - state.entities (entidades DS)
 *  - state.internationalSport (13 países /Sports)
 *
 * Clasifica cada hit por:
 *  - intensity: 'confirmed' | 'advanced' | 'rumor'
 *  - movement:  'in' | 'out' | 'renewal' | 'unknown'
 *
 * Gated a INSTANCE_NAME=sport.
 */

// ── Diccionarios ─────────────────────────────────────────────────────────

// Confirmado: hecho consumado o inminente en horas
// (evitamos keywords demasiado cortas o ambiguas tipo 'es del', 'oficial'
// suelto, 'contrato con' — meten mucho ruido)
const CONFIRMED = [
  // ES
  'ficha por', 'ficha con', 'ya es del', 'ya es nuevo', 'nuevo jugador del',
  'nueva incorporación del', 'presentación oficial de', 'presentado como nuevo',
  'firma con el', 'firma por el', 'firma su nuevo contrato con',
  'revision medica', 'revisión médica', 'pasa reconocimiento medico',
  'anuncio oficial del fichaje', 'confirmado el fichaje', 'confirmado como nuevo',
  'ya posa con', 'estampa su firma', 'sella su llegada',
  'sella su fichaje', 'oficial:', 'oficial,', 'traspaso oficial',
  'fichaje oficial', 'es nuevo jugador', 'nuevo entrenador del',
  'nueva incorporación',
  // EN
  'here we go', 'done deal', 'signs for', 'officially joins', 'unveiled as',
  'completes move to', 'medical done', 'medical completed',
  'has signed for', 'has signed with', 'officially announced', 'joins on',
  'joins from', 'new signing',
  // IT
  'ufficiale:', 'ufficializzato', 'firma con il', 'firmato con', 'nuovo acquisto del',
  // FR
  'officiel :', 'officialisé', 'signe avec le', 'signe pour le',
  // DE
  'wechselt zu', 'verpflichtet', 'unterschreibt bei', 'unterzeichnet bei',
  // PT
  'contratação oficial', 'assina com o', 'assina pelo', 'oficializa contratação',
];

// Avanzado: acuerdo cerrado pero no oficial (medical soon, agreed terms)
const ADVANCED = [
  // ES
  'acuerdo total', 'acuerdo verbal', 'acuerdo cerrado', 'principio de acuerdo',
  'acuerdo con', 'acuerdo entre', 'acuerdo alcanzado', 'todo listo',
  'todo cerrado', 'llegó a un acuerdo', 'cierra el fichaje',
  'ultima los detalles', 'últimos detalles', 'ultimos flecos',
  'pasará revisión', 'llegará a', 'inminente fichaje', 'a punto de fichar',
  'está a un paso', 'esta a un paso', 'a un paso de',
  // EN
  'agreed personal terms', 'agrees personal terms', 'agree personal terms',
  'agreement reached', 'agree deal', 'agreed deal', 'agreed a fee',
  'agreed fee', 'set to sign', 'set to join', 'on the verge of',
  'close to signing', 'medical scheduled', 'medical booked',
  // IT
  'accordo raggiunto', 'accordo con', 'accordo trovato', 'ultimi dettagli',
  'vicino a firmare', 'a un passo da',
  // FR
  'accord trouvé', 'accord conclu', 'proche de signer', 'sur le point de signer',
  // DE
  'sich einig', 'kurz vor',
  // PT
  'acordo fechado', 'acordo alcançado', 'próximo de fechar',
];

// Rumor / interés / sondeo.
// Palabras como 'objetivo', 'target', 'candidato' solas eran demasiado
// genéricas (matcheaban titulares de salud, política, etc.). Usamos
// compuestas donde sea posible.
const RUMOR = [
  // ES
  'sondea a', 'sondea al', 'sondeo por', 'primeros contactos con',
  'primer contacto con', 'primer contacto por',
  'interesado en fichar', 'interés por fichar', 'interés en el fichaje',
  'sigue de cerca a', 'sigue de cerca al', 'sigue los pasos de',
  'estudia el fichaje', 'estudia fichar', 'estudia la incorporación',
  'quiere fichar a', 'quiere fichar al', 'quiere al jugador', 'busca fichar',
  'suena para el', 'suena para fichar', 'suena como nuevo', 'suena en el',
  'candidato al banquillo', 'candidato a fichar',
  'objetivo prioritario del', 'objetivo del', 'gran objetivo del',
  'objetivo para el ataque', 'objetivo para reforzar',
  'en el punto de mira del', 'en la agenda del', 'en el radar del',
  'entra en la agenda',
  'oferta por', 'ofrece por', 'prepara oferta por', 'lanza oferta por',
  'presentará oferta', 'oferta rechazada', 'rechaza oferta',
  'se rumorea', 'rumor de fichaje', 'rumor sobre el fichaje',
  // EN
  'linked with', 'linked to', 'transfer target', 'summer target',
  'winter target', 'top target', 'wants to sign', 'want to sign',
  'wanted by', 'monitoring', 'interested in signing',
  'bid rejected', 'bid accepted', 'submitted a bid', 'made a bid',
  // IT
  'obiettivo del', 'obiettivo di mercato', 'sondaggio del', 'piace al',
  'nel mirino del', 'seguito dal',
  // FR
  'piste du', 'cible du', 'suit de près', 'intéresse le', 'intérêt pour',
  // DE
  'im visier von', 'interesse an', 'wunschspieler',
  // PT
  'sondagem do', 'interessa ao', 'olho em', 'agrada ao',
];

// Contexto de movimiento
const MOVE_IN_HINTS = [
  'ficha por', 'ficha con', 'firma con', 'firma por', 'llega al', 'llega a',
  'nuevo jugador', 'incorporacion', 'incorporación', 'arriva', 'joins',
  'signs for', 'joins on', 'wechselt zu', 'verpflichtet', 'signe avec',
  'signe pour', 'assina',
];
const MOVE_OUT_HINTS = [
  'adios al', 'adiós al', 'adios a', 'adiós a', 'deja el', 'deja al',
  'se marcha', 'se despide', 'abandona', 'exits', 'leaves', 'departs',
  'quitte', 'verlässt', 'saluto a', 'lascia', 'sai do', 'sai da',
  'salida', 'saída', 'traspasado', 'cedido', 'cede al', 'sale del',
];
const MOVE_RENEWAL_HINTS = [
  'renueva', 'renovación', 'renovacion', 'renueva su contrato', 'amplía contrato',
  'amplia contrato', 'extiende contrato', 'extension', 'extends',
  'extends deal', 'extends contract', 'contract extension', 'rinnovo',
  'rinnova', 'prolonge', 'prolongation', 'verlängert', 'verlangert',
  'vertragsverlängerung', 'renova', 'renovação',
];

// Contexto deportivo (para SOFT keywords)
const SPORT_CONTEXT_RE = /\b(futbol|fútbol|football|soccer|liga|laliga|champions|jugador|jugadora|seleccionador|entrenador|estadio|partido|gol|goles|delantero|delantera|mediocampista|centrocampista|centrocampo|portero|guardameta|defensa|fc |real madrid|barcelona|atletico|athletic|betis|sevilla|valencia|villarreal|man united|manchester|arsenal|liverpool|chelsea|tottenham|city|psg|bayern|inter|milan|juventus|napoli|serie a|premier league|bundesliga|ligue 1|ligue1|europa league|conference)\b/;
const URL_SPORT_CONTEXT_RE = /\/(futbol|football|soccer|fichajes|transfer|transfers|mercato|mercado|calciomercato|premier|laliga|champions|serie-?a|bundesliga|ligue-?1)(\/|-|$)/;

// Blacklist: si el titular contiene alguno de estos términos, descartamos
// el hit — cubre casos de fichajes matcheados dentro de contexto NO editorial
// de mercado (salud, política, sucesos, virales, entrevistas retro…).
const BLACKLIST_RE = /\b(padre de|madre de|hijo de|urologo|urólogo|entrenador personal|salud|fallece|muere|muerte|funeral|hospital|denuncia|robaron|robado|cárcel|carcel|prision|prisión|tribunal|juicio|acusado|abogado|abogados|declara ante|declaraciones|entrevista con|entrevista a|viral|voltou a viralizar|se hace viral|meme|memes|humor|opinión|opinion|editorial)\b/;

function normalize(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const NORM_CONFIRMED = CONFIRMED.map(normalize);
const NORM_ADVANCED = ADVANCED.map(normalize);
const NORM_RUMOR = RUMOR.map(normalize);
const NORM_IN = MOVE_IN_HINTS.map(normalize);
const NORM_OUT = MOVE_OUT_HINTS.map(normalize);
const NORM_RENEWAL = MOVE_RENEWAL_HINTS.map(normalize);

type Intensity = 'confirmed' | 'advanced' | 'rumor';
type Movement = 'in' | 'out' | 'renewal' | 'unknown';

interface Hit {
  intensity: Intensity;
  keyword: string;
  movement: Movement;
}

function detectHit(title: string, url: string): Hit | null {
  const t = normalize(title);
  const u = (url || '').toLowerCase();
  const combined = t + ' ' + u;

  // Requerir contexto deportivo para minimizar falsos positivos
  const hasSportCtx = SPORT_CONTEXT_RE.test(t) || URL_SPORT_CONTEXT_RE.test(u);
  if (!hasSportCtx) return null;

  // Descartar si el titular pertenece a contextos NO editoriales de mercado
  // (salud, política, sucesos, virales, entrevistas retro…)
  if (BLACKLIST_RE.test(t)) return null;

  // Precedencia: confirmed > advanced > rumor
  let intensity: Intensity | null = null;
  let keyword = '';
  for (const k of NORM_CONFIRMED) {
    if (combined.includes(k)) { intensity = 'confirmed'; keyword = k; break; }
  }
  if (!intensity) {
    for (const k of NORM_ADVANCED) {
      if (combined.includes(k)) { intensity = 'advanced'; keyword = k; break; }
    }
  }
  if (!intensity) {
    for (const k of NORM_RUMOR) {
      if (combined.includes(k)) { intensity = 'rumor'; keyword = k; break; }
    }
  }
  if (!intensity) return null;

  // Movimiento (in / out / renewal / unknown)
  let movement: Movement = 'unknown';
  for (const k of NORM_RENEWAL) if (combined.includes(k)) { movement = 'renewal'; break; }
  if (movement === 'unknown') for (const k of NORM_OUT) if (combined.includes(k)) { movement = 'out'; break; }
  if (movement === 'unknown') for (const k of NORM_IN) if (combined.includes(k)) { movement = 'in'; break; }

  return { intensity, keyword, movement };
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if ((process.env.INSTANCE_NAME || 'main') !== 'sport') {
    res.status(404).json({ error: 'not found' });
    return;
  }
  try {
    await loadState();
    const s = getState() as any;
    const nowMs = Date.now();
    const windowMs = 24 * 3600_000;

    // ── 1) RSS/sitemap con match ──────────────────────────────────────────
    const articles = (s.mediaArticles || {}) as Record<string, any>;
    const matchedArticles: any[] = [];
    for (const [, a] of Object.entries(articles)) {
      const pubMs = a.pubDate ? new Date(a.pubDate).getTime() : NaN;
      const firstMs = a.firstSeen ? new Date(a.firstSeen).getTime() : NaN;
      const refMs = !isNaN(pubMs) ? pubMs : firstMs;
      if (isNaN(refMs) || nowMs - refMs > windowMs) continue;
      const hit = detectHit(a.title || '', a.link || '');
      if (!hit) continue;
      matchedArticles.push({
        title: a.title || '',
        link: a.link,
        domain: extractDomain(a.link),
        feedName: a.feedName,
        pubDate: a.pubDate,
        firstSeen: a.firstSeen,
        ...hit,
      });
    }
    matchedArticles.sort((x, y) => {
      const tx = new Date(x.pubDate || x.firstSeen).getTime();
      const ty = new Date(y.pubDate || y.firstSeen).getTime();
      return ty - tx;
    });

    // ── 2) Discover ES pages vigentes ─────────────────────────────────────
    const pages = (s.pages || {}) as Record<string, any>;
    const matchedPages: any[] = [];
    for (const [url, p] of Object.entries(pages)) {
      const hit = detectHit(p.title || '', url);
      if (!hit) continue;
      matchedPages.push({
        url, title: p.title || '', image: p.image,
        domain: p.domain, score: p.score || 0,
        position: p.position, firstSeen: p.firstSeen,
        ...hit,
      });
    }
    matchedPages.sort((a, b) => b.score - a.score);

    // ── 3) Cross-country pages ────────────────────────────────────────────
    const intl = (s.internationalSport || {}) as Record<string, any>;
    const intlHits: any[] = [];
    for (const [code, snap] of Object.entries(intl)) {
      const pgs = snap?.pages || [];
      for (const p of pgs) {
        const hit = detectHit(p.title || '', p.url || '');
        if (!hit) continue;
        intlHits.push({
          country: code,
          title: p.title || '',
          url: p.url || '',
          image: p.image,
          domain: p.domain || p.publisher,
          score: p.score || 0,
          ...hit,
        });
      }
    }
    intlHits.sort((a, b) => b.score - a.score);

    // ── Summary agregados ────────────────────────────────────────────────
    const byIntensity = { confirmed: 0, advanced: 0, rumor: 0 };
    const byMovement = { in: 0, out: 0, renewal: 0, unknown: 0 };
    const byPublisher = new Map<string, number>();
    const keywordsCount = new Map<string, number>();
    for (const arr of [matchedArticles, matchedPages, intlHits]) {
      for (const h of arr as any[]) {
        byIntensity[h.intensity as Intensity]++;
        byMovement[h.movement as Movement]++;
        if (h.domain) byPublisher.set(h.domain, (byPublisher.get(h.domain) || 0) + 1);
        keywordsCount.set(h.keyword, (keywordsCount.get(h.keyword) || 0) + 1);
      }
    }
    const publisherSummary = [...byPublisher.entries()]
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    const keywordsTop = [...keywordsCount.entries()]
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    res.setHeader('Cache-Control', 's-maxage=300');
    res.json({
      windowHours: 24,
      computedAt: new Date().toISOString(),
      summary: {
        articles: matchedArticles.length,
        pages: matchedPages.length,
        internationalPages: intlHits.length,
        total: matchedArticles.length + matchedPages.length + intlHits.length,
        byIntensity, byMovement,
        publishers: publisherSummary.length,
      },
      keywordsTop,
      publisherSummary,
      matchedPages: matchedPages.slice(0, 40),
      matchedArticles: matchedArticles.slice(0, 120),
      internationalHits: intlHits.slice(0, 50),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
