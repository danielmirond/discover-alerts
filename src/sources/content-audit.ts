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

/** Quita todo lo que NO sea cuerpo editorial: scripts, estilos, navegación,
 * pie, sidebar, comentarios. Lo que queda es una buena aproximación al
 * texto del artículo. */
function extractBodyText(html: string): string {
  let s = html;
  s = stripBlock(s, 'script');
  s = stripBlock(s, 'style');
  s = stripBlock(s, 'noscript');
  s = stripBlock(s, 'svg');
  s = stripBlock(s, 'header');
  s = stripBlock(s, 'footer');
  s = stripBlock(s, 'nav');
  s = stripBlock(s, 'aside');
  s = stripBlock(s, 'form');
  // Strip HTML tags
  s = s.replace(/<[^>]+>/g, ' ');
  // Decode common entities suficiente para conteo
  s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#\d+;/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
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
    const bodyText = extractBodyText(html);
    return {
      ...base,
      title: extractTitle(html),
      wordCount: countWords(bodyText),
      h1: countTag(html, 'h1'),
      h2: countTag(html, 'h2'),
      h3: countTag(html, 'h3'),
      images: countImages(html),
      videos: countVideos(html),
      paragraphs: countTag(html, 'p'),
      lists: countTag(html, 'ul') + countTag(html, 'ol'),
      amp: /<html[^>]+(?:⚡|amp\s*=)/i.test(html) || /<link[^>]+rel=["']amphtml["']/i.test(html),
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
