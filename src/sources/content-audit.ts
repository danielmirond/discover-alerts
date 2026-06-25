/**
 * Auditor estructural de contenido para páginas en Discover ES /Sports.
 *
 * Fetcha la URL, parsea HTML con regex (sin dependencias pesadas tipo
 * cheerio porque rompería el bundle Vercel) y extrae las características
 * editoriales que sirven al redactor para comparar formatos ganadores:
 *
 *   - wordCount      total de palabras del cuerpo (después de quitar nav/footer/script)
 *   - h1, h2, h3     conteos de encabezados
 *   - images         conteo de <img> (incluye lazy y picture/source)
 *   - videos         conteo de <video>, <iframe> de youtube/vimeo/dailymotion,
 *                    contenedores típicos de player (.jwplayer, .video-js…)
 *   - paragraphs     conteo de <p>
 *   - lists          conteo de <ul>/<ol>
 *   - amp            true si <html ⚡> o tiene amphtml link
 *
 * Es heurístico — los CMS varían mucho. Para precisión total habría que
 * usar headless browser, pero el coste no compensa para esta señal.
 */

export interface ContentAuditResult {
  url: string;
  publisher?: string;
  title?: string;
  wordCount: number;
  h1: number;
  h2: number;
  h3: number;
  images: number;
  videos: number;
  paragraphs: number;
  lists: number;
  amp: boolean;
  /** Qué selector se usó para aislar el cuerpo: article | itemprop | main |
   * full (fallback con strip de chrome). Permite saber cuántas pages tienen
   * markup semántico vs cuántas caen al fallback ruidoso. */
  bodySource?: 'article' | 'itemprop' | 'main' | 'full';
  /** Tiempo de fetch en ms (debug). */
  fetchMs: number;
  /** Si algo falló, mensaje. wordCount/etc serán 0. */
  error?: string;
}

const UA = 'Mozilla/5.0 (compatible; DiscoverAlertsAuditBot/1.0; +https://discover-alerts.vercel.app)';

function stripBlock(html: string, tag: string): string {
  const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
  return html.replace(re, ' ');
}

/** Extrae el contenido entre <tag> y su </tag> respetando anidamiento.
 * Devuelve el primer match útil — para `<article>` los medios suelen tener
 * uno solo. Para casos como `<section>` o `<div>` no usar (demasiados).
 * Si no hay match, devuelve null. */
function extractBalancedTag(html: string, tag: string): string | null {
  const openRe = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
  const closeRe = new RegExp(`<\\/${tag}\\s*>`, 'gi');
  const openMatch = openRe.exec(html);
  if (!openMatch) return null;
  const start = openMatch.index + openMatch[0].length;

  // Buscar el cierre balanceado contando aperturas/cierres a partir de start
  let depth = 1;
  let pos = start;
  while (depth > 0 && pos < html.length) {
    openRe.lastIndex = pos;
    closeRe.lastIndex = pos;
    const nextOpen = openRe.exec(html);
    const nextClose = closeRe.exec(html);
    if (!nextClose) return null;
    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++;
      pos = nextOpen.index + nextOpen[0].length;
    } else {
      depth--;
      if (depth === 0) return html.slice(start, nextClose.index);
      pos = nextClose.index + nextClose[0].length;
    }
  }
  return null;
}

/** Busca el bloque `<div itemprop="articleBody">…</div>` (schema.org). */
function extractArticleBodyByItemprop(html: string): string | null {
  const re = /<(\w+)\b[^>]*\bitemprop\s*=\s*["']articleBody["'][^>]*>/i;
  const m = re.exec(html);
  if (!m) return null;
  const tag = m[1].toLowerCase();
  // Reutilizar extractBalancedTag desde el offset del match
  const rest = html.slice(m.index);
  return extractBalancedTag(rest, tag);
}

function countTag(html: string, tag: string): number {
  // matchea <tag> con cualquier atributo, incluye self-closing
  const re = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
  return (html.match(re) || []).length;
}

function extractTitle(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return undefined;
  return m[1].replace(/\s+/g, ' ').trim().slice(0, 200);
}

function extractPublisher(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch { return ''; }
}

/** Limpia un fragmento HTML conservando solo texto editorial:
 *  - elimina scripts/styles/noscript/svg
 *  - elimina headers/footers/navs/asides anidados (algunos <article> incluyen
 *    "related" o "share" bars marcados como <aside>)
 *  - elimina forms
 *  - quita resto de tags
 *  - decodifica entities
 */
function cleanFragmentText(fragment: string): string {
  let s = fragment;
  s = stripBlock(s, 'script');
  s = stripBlock(s, 'style');
  s = stripBlock(s, 'noscript');
  s = stripBlock(s, 'svg');
  s = stripBlock(s, 'header');
  s = stripBlock(s, 'footer');
  s = stripBlock(s, 'nav');
  s = stripBlock(s, 'aside');
  s = stripBlock(s, 'form');
  s = s.replace(/<[^>]+>/g, ' ');
  s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#\d+;/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/** Selecciona el fragmento HTML que representa el cuerpo del artículo y
 * además devuelve qué selector usó. Si nada matchea, usa el HTML completo
 * marcado como 'full' (fallback ruidoso).
 */
function pickArticleFragment(html: string): { fragment: string; source: ContentAuditResult['bodySource'] } {
  const article = extractBalancedTag(html, 'article');
  if (article && article.trim().length > 200) return { fragment: article, source: 'article' };
  const itemprop = extractArticleBodyByItemprop(html);
  if (itemprop && itemprop.trim().length > 200) return { fragment: itemprop, source: 'itemprop' };
  const main = extractBalancedTag(html, 'main');
  if (main && main.trim().length > 200) return { fragment: main, source: 'main' };
  return { fragment: html, source: 'full' };
}

function countWords(text: string): number {
  if (!text) return 0;
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

function countVideos(html: string): number {
  let n = 0;
  n += countTag(html, 'video');
  // iframes embebidos (yt/vimeo/dailymotion/jwplayer/brid/dazn…)
  const iframeRe = /<iframe[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = iframeRe.exec(html))) {
    const src = m[1].toLowerCase();
    if (/youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|jwplayer|brid\.tv|dazn\.com|streamable\.com|twitch\.tv|tiktok\.com/.test(src)) {
      n++;
    }
  }
  // Contenedores típicos de player
  const playerContainers = [
    /class=["'][^"']*\b(jwplayer|video-js|videojs|brid-video|dazn-player|yt-player|html5-video-player|player-container|brightcove|kaltura-player)\b[^"']*["']/gi,
  ];
  for (const re of playerContainers) {
    n += (html.match(re) || []).length;
  }
  return n;
}

function countImages(html: string): number {
  // <img>, <picture><source> y <amp-img>
  let n = countTag(html, 'img');
  n += countTag(html, 'amp-img');
  // <picture> con <source srcset> cuenta solo el <picture> envoltorio
  n += countTag(html, 'picture');
  // Eliminar pictures de doble cuento (picture incluye img dentro)
  // Aproximación: si <picture> N veces, restamos N porque cada uno contiene un <img>
  const pictureCount = countTag(html, 'picture');
  if (pictureCount > 0) n -= pictureCount;
  return Math.max(0, n);
}

export async function auditUrl(url: string, timeoutMs = 12_000): Promise<ContentAuditResult> {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const base: ContentAuditResult = {
    url, publisher: extractPublisher(url),
    wordCount: 0, h1: 0, h2: 0, h3: 0,
    images: 0, videos: 0, paragraphs: 0, lists: 0, amp: false,
    fetchMs: 0,
  };
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'user-agent': UA, 'accept': 'text/html,application/xhtml+xml' },
      redirect: 'follow',
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('html')) throw new Error(`content-type ${ct}`);
    const html = await r.text();
    // AMP se detecta sobre el HTML completo (la etiqueta <html> está fuera del article)
    const amp = /<html[^>]+(?:⚡|amp\s*=)/i.test(html) || /<link[^>]+rel=["']amphtml["']/i.test(html);
    // Aislar cuerpo del artículo. Todo el conteo se hace SOLO sobre este
    // fragmento — fuera quedan "lo más leído", "relacionadas", comentarios,
    // breadcrumbs, share bars, footers de autor.
    const picked = pickArticleFragment(html);
    const body = picked.fragment;
    const bodyText = cleanFragmentText(body);
    return {
      ...base,
      title: extractTitle(html),
      bodySource: picked.source,
      wordCount: countWords(bodyText),
      h1: countTag(body, 'h1'),
      h2: countTag(body, 'h2'),
      h3: countTag(body, 'h3'),
      images: countImages(body),
      videos: countVideos(body),
      paragraphs: countTag(body, 'p'),
      lists: countTag(body, 'ul') + countTag(body, 'ol'),
      amp,
      fetchMs: Date.now() - t0,
    };
  } catch (err: any) {
    return { ...base, error: err.message || 'fetch failed', fetchMs: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
  }
}

/** Audita un lote secuencial con throttle entre llamadas (evita bursts). */
export async function auditBatch(urls: string[], throttleMs = 300): Promise<ContentAuditResult[]> {
  const results: ContentAuditResult[] = [];
  for (const url of urls) {
    const r = await auditUrl(url);
    results.push(r);
    if (throttleMs > 0) await new Promise(res => setTimeout(res, throttleMs));
  }
  return results;
}
