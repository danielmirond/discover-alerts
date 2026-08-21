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
  /** Nº de palabras del titular extraído (preferimos <h1> dentro del article;
   * fallback a <title>). 0 si vacío. */
  titleWordCount: number;
  wordCount: number;
  h1: number;
  h2: number;
  h3: number;
  /** Nº de palabras del PRIMER subtítulo H2 — sirve como proxy de "amplitud
   * de entradilla". Muchos medios usan el primer H2 como gancho post-titular. */
  firstSubtitleWordCount: number;
  /** Media de palabras por H2 a lo largo del artículo. */
  avgSubtitleWordCount: number;
  images: number;
  videos: number;
  /** Nº de enlaces `<a>` dentro del cuerpo del article (excluye anchor sin href). */
  links: number;
  paragraphs: number;
  lists: number;
  amp: boolean;
  /** Qué selector se usó para aislar el cuerpo: article | itemprop | main |
   * full (fallback con strip de chrome). Permite saber cuántas pages tienen
   * markup semántico vs cuántas caen al fallback ruidoso. */
  bodySource?: 'article' | 'itemprop' | 'main' | 'full';
  /** Encoding score 0-100 (checklist de elegibilidad Discover).
   * Marco Empty Shelves / Recall del paper Google Research 2602.14080:
   *  Encoding = ¿es tu URL elegible para el feed?
   *  Puntúa AMP, JSON-LD NewsArticle, image ≥1200px, headline OK,
   *  H1 presente, word count razonable. */
  encodingScore?: number;
  /** Issues que faltan para el encoding perfect. */
  encodingIssues?: string[];
  /** JSON-LD detectado. */
  jsonLdOk?: boolean;
  /** Author URL declarado en JSON-LD (señal author profile Google). */
  hasAuthorUrl?: boolean;
  /** Image principal >=1200px (recomendación Discover). */
  imageWidthOk?: boolean;
  /** Tiempo de fetch en ms (debug). */
  fetchMs: number;
  /** Si algo falló, mensaje. wordCount/etc serán 0. */
  error?: string;
}

const UA = 'Mozilla/5.0 (compatible; DiscoverAlertsAuditBot/1.0; +https://discover-alerts.vercel.app)';

/** Extrae y parsea todos los <script type="application/ld+json"> del HTML.
 * Devuelve array de objetos (algunos publishers meten varios blobs).
 * Casos soportados:
 *  - blob único {@type: NewsArticle}
 *  - blob único {@graph: [{...}, {...}]} (schema.org format estándar)
 *  - array raíz [{...}, {...}] (El Español y algunos otros)
 *  - array con nodes que a su vez traen @graph anidado
 *  - CDATA / whitespace / comentarios HTML dentro del script
 */
function extractJsonLd(html: string): any[] {
  // Regex más permisiva: acepta espacios en type=, comillas dobles/simples/sin,
  // y espacios extras entre atributos.
  const re = /<script\b[^>]*\btype\s*=\s*["']?\s*application\/ld\+json\s*["']?[^>]*>([\s\S]*?)<\/script>/gi;
  const out: any[] = [];
  let m: RegExpExecArray | null;
  const push = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    out.push(obj);
    // Expandir @graph anidado recursivamente
    const graph = obj['@graph'];
    if (Array.isArray(graph)) {
      for (const node of graph) push(node);
    }
  };
  while ((m = re.exec(html))) {
    try {
      let raw = m[1].trim();
      // Quitar CDATA / comentarios HTML si envuelven el JSON
      raw = raw.replace(/^\/\*<!\[CDATA\[\*\/|\/\*\]\]>\*\/$/g, '').trim();
      raw = raw.replace(/^<!--|-->\s*$/g, '').trim();
      raw = raw.replace(/^<!\[CDATA\[|\]\]>$/g, '').trim();
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const p of parsed) push(p);
      } else {
        push(parsed);
      }
    } catch { /* ignore malformed json-ld */ }
  }
  return out;
}

/** Detecta si algún JSON-LD es NewsArticle/Article-like y qué campos tiene.
 * Acepta variantes: NewsArticle, Article, ReportageNewsArticle,
 * LiveBlogPosting, AnalysisNewsArticle, BackgroundNewsArticle, OpinionNewsArticle,
 * ReviewNewsArticle, SatiricalArticle, AdvertiserContentArticle. */
const ARTICLE_TYPE_RE = /^(NewsArticle|Article|ReportageNewsArticle|LiveBlogPosting|AnalysisNewsArticle|BackgroundNewsArticle|OpinionNewsArticle|ReviewNewsArticle|SatiricalArticle|AdvertiserContentArticle)$/i;

function analyzeJsonLd(blobs: any[]) {
  let hasNewsArticle = false;
  let hasAuthorUrl = false;
  let hasDatePublished = false;
  let hasHeadline = false;
  let hasImage = false;
  let imageWidth: number | null = null;
  for (const b of blobs) {
    if (!b || typeof b !== 'object') continue;
    const type = b['@type'];
    const isArticle = (typeof type === 'string' && ARTICLE_TYPE_RE.test(type)) ||
      (Array.isArray(type) && type.some((t: any) => typeof t === 'string' && ARTICLE_TYPE_RE.test(t)));
    if (!isArticle) continue;
    hasNewsArticle = true;
    if (b.datePublished || b.dateCreated) hasDatePublished = true;
    if (b.headline || b.name) hasHeadline = true;
    // Author puede ser Person, Organization, array, o string. sameAs es acepable.
    const authors = Array.isArray(b.author) ? b.author : (b.author ? [b.author] : []);
    for (const a of authors) {
      if (!a) continue;
      if (typeof a === 'object' && (a.url || a.sameAs || a['@id'])) { hasAuthorUrl = true; break; }
    }
    // Image puede ser: string URL, object ImageObject, array de cualquiera.
    const imgs = Array.isArray(b.image) ? b.image : (b.image ? [b.image] : []);
    for (const img of imgs) {
      if (!img) continue;
      hasImage = true;
      if (typeof img === 'object') {
        const w = img.width || img.contentWidth;
        if (w) {
          const n = typeof w === 'number' ? w : parseInt(String(w).replace(/[^\d]/g, ''), 10);
          if (!isNaN(n)) imageWidth = Math.max(imageWidth || 0, n);
        }
      }
    }
    // primaryImageOfPage fallback
    if (!hasImage && b.primaryImageOfPage) hasImage = true;
  }
  return { hasNewsArticle, hasAuthorUrl, hasDatePublished, hasHeadline, hasImage, imageWidth };
}

/** Estima el mayor ancho de imagen documentado en el HTML.
 * Fuentes por orden de fiabilidad:
 *   - <meta property="og:image:width">
 *   - <meta property="twitter:image:width">
 *   - <img srcset="url 1600w, url 800w..."> → toma el max
 *   - <img width="X">  (menos fiable, muchos meten thumbnails)
 *   - URLs de imagen con dimensiones en el path (marca.com, elpais.com hacen /600x/)
 */
function extractOgImageWidth(html: string): number | null {
  let max = 0;
  const og = html.match(/<meta[^>]+property=["']og:image:width["'][^>]+content=["'](\d+)["']/i);
  if (og) max = Math.max(max, parseInt(og[1], 10));
  const tw = html.match(/<meta[^>]+(?:name|property)=["']twitter:image:width["'][^>]+content=["'](\d+)["']/i);
  if (tw) max = Math.max(max, parseInt(tw[1], 10));
  // srcset del article (varias entries "url 1200w, url 1600w")
  const srcsetMatches = html.match(/srcset=["'][^"']+["']/gi) || [];
  for (const s of srcsetMatches.slice(0, 5)) {
    const widths = [...s.matchAll(/(\d{3,4})w/g)].map(m => parseInt(m[1], 10));
    if (widths.length > 0) max = Math.max(max, ...widths);
  }
  // <img width="X"> (primer significativo, >=200)
  const imgWidths = [...html.matchAll(/<img[^>]+width=["'](\d{3,4})["']/gi)].map(m => parseInt(m[1], 10));
  if (imgWidths.length > 0) max = Math.max(max, ...imgWidths.filter(w => w >= 200));
  // Path-based (marca.com/rc/xxxxxxxx_1200x630/...) o similar
  const pathW = [...html.matchAll(/[_\/](\d{3,4})x\d{3,4}\b/g)].map(m => parseInt(m[1], 10));
  if (pathW.length > 0) max = Math.max(max, ...pathW.filter(w => w >= 400));
  return max > 0 ? max : null;
}

/** Calcula encoding_score 0-100 con checklist explícita. */
function computeEncodingScore(inputs: {
  amp: boolean;
  jsonLd: ReturnType<typeof analyzeJsonLd>;
  ogImageWidth: number | null;
  wordCount: number;
  titleWordCount: number;
  h1Count: number;
  h2Count: number;
  imagesInBody: number;
  bodySource: string;
}): { score: number; issues: string[]; imageWidthOk: boolean } {
  const issues: string[] = [];
  let score = 0;

  // 1. Markup semántico (article/main/itemprop) — 10
  if (['article', 'itemprop', 'main'].includes(inputs.bodySource)) score += 10;
  else issues.push('sin markup semántico <article>');

  // 2. JSON-LD NewsArticle presente — 15
  if (inputs.jsonLd.hasNewsArticle) score += 15;
  else issues.push('falta JSON-LD NewsArticle');

  // 3. author.url en JSON-LD — 10 (señal Search Profile / autoría reconocida)
  if (inputs.jsonLd.hasAuthorUrl) score += 10;
  else if (inputs.jsonLd.hasNewsArticle) issues.push('falta author.url en JSON-LD');

  // 4. datePublished — 5
  if (inputs.jsonLd.hasDatePublished) score += 5;
  else if (inputs.jsonLd.hasNewsArticle) issues.push('falta datePublished');

  // 5. headline en JSON-LD — 5
  if (inputs.jsonLd.hasHeadline) score += 5;
  else if (inputs.jsonLd.hasNewsArticle) issues.push('falta headline en JSON-LD');

  // 6. image en JSON-LD — 5
  if (inputs.jsonLd.hasImage) score += 5;
  else if (inputs.jsonLd.hasNewsArticle) issues.push('falta image en JSON-LD');

  // 7. image ≥1200px (recomendación Discover) — 15
  const declaredWidth = inputs.jsonLd.imageWidth || inputs.ogImageWidth || 0;
  const imageWidthOk = declaredWidth >= 1200;
  if (imageWidthOk) score += 15;
  else if (declaredWidth > 0) issues.push(`imagen ${declaredWidth}px < 1200px`);
  else issues.push('no se pudo verificar ancho de imagen');

  // 8. Titular en el rango 40-90 chars aprox (6-12 palabras) — 10
  if (inputs.titleWordCount >= 6 && inputs.titleWordCount <= 14) score += 10;
  else if (inputs.titleWordCount > 0) issues.push(`titular ${inputs.titleWordCount} palabras fuera del rango 6-14`);

  // 9. H1 presente exactamente 1 — 5
  if (inputs.h1Count === 1) score += 5;
  else if (inputs.h1Count === 0) issues.push('sin H1');
  else issues.push(`${inputs.h1Count} H1 (debe ser 1)`);

  // 10. AMP o canonical con AMP alt — 5
  if (inputs.amp) score += 5;

  // 11. Word count razonable (300-2500) — 10
  if (inputs.wordCount >= 300 && inputs.wordCount <= 2500) score += 10;
  else if (inputs.wordCount < 300) issues.push(`solo ${inputs.wordCount} palabras (mínimo 300)`);
  else issues.push(`${inputs.wordCount} palabras (excede 2500)`);

  // 12. ≥1 imagen dentro del cuerpo — 5
  if (inputs.imagesInBody >= 1) score += 5;
  else issues.push('sin imágenes en el cuerpo');

  return { score, issues, imageWidthOk };
}

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

/** Extrae el texto de la PRIMERA aparición de un tag (con regex no balanceado).
 * Suficiente para H1/H2 cortos (no anidan). Devuelve string sin tags. */
function firstTagText(html: string, tag: string): string {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = re.exec(html);
  if (!m) return '';
  return m[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&\w+;/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Extrae el texto de TODAS las apariciones de un tag y devuelve un array. */
function allTagTexts(html: string, tag: string): string[] {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const text = m[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&\w+;/g, ' ').replace(/\s+/g, ' ').trim();
    if (text) out.push(text);
  }
  return out;
}

/** Cuenta enlaces editoriales dentro del cuerpo. Excluye:
 *   - <a> sin href (ancla pura)
 *   - href que empieza por # (in-page jump)
 *   - href javascript:/mailto:/tel:
 */
function countLinks(html: string): number {
  const re = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let n = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = m[1].trim();
    if (!href) continue;
    if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    n++;
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
    titleWordCount: 0,
    wordCount: 0, h1: 0, h2: 0, h3: 0,
    firstSubtitleWordCount: 0, avgSubtitleWordCount: 0,
    images: 0, videos: 0, links: 0,
    paragraphs: 0, lists: 0, amp: false,
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
    // Titular: preferir el <h1> dentro del article (más fiable que <title>,
    // que incluye sufijos del medio tipo " | Marca" o " - El País").
    const h1Text = firstTagText(body, 'h1') || extractTitle(html) || '';
    const titleWordCount = countWords(h1Text);
    // Subtítulos H2 dentro del article — primero y media de palabras.
    const h2Texts = allTagTexts(body, 'h2');
    const firstSubtitleWordCount = h2Texts[0] ? countWords(h2Texts[0]) : 0;
    const avgSubtitleWordCount = h2Texts.length > 0
      ? Math.round(h2Texts.reduce((s, t) => s + countWords(t), 0) / h2Texts.length)
      : 0;
    // Encoding score (marco Empty Shelves / Recall)
    const jsonLdBlobs = extractJsonLd(html);
    const jsonLdAnalysis = analyzeJsonLd(jsonLdBlobs);
    const ogImageWidth = extractOgImageWidth(html);
    const imagesInBody = countImages(body);
    const h1Count = countTag(body, 'h1');
    const encoding = computeEncodingScore({
      amp,
      jsonLd: jsonLdAnalysis,
      ogImageWidth,
      wordCount: countWords(bodyText),
      titleWordCount,
      h1Count,
      h2Count: countTag(body, 'h2'),
      imagesInBody,
      bodySource: picked.source || 'full',
    });

    return {
      ...base,
      title: extractTitle(html),
      bodySource: picked.source,
      titleWordCount,
      wordCount: countWords(bodyText),
      h1: h1Count,
      h2: countTag(body, 'h2'),
      h3: countTag(body, 'h3'),
      firstSubtitleWordCount,
      avgSubtitleWordCount,
      images: imagesInBody,
      videos: countVideos(body),
      links: countLinks(body),
      paragraphs: countTag(body, 'p'),
      lists: countTag(body, 'ul') + countTag(body, 'ol'),
      amp,
      encodingScore: encoding.score,
      encodingIssues: encoding.issues,
      jsonLdOk: jsonLdAnalysis.hasNewsArticle,
      hasAuthorUrl: jsonLdAnalysis.hasAuthorUrl,
      imageWidthOk: encoding.imageWidthOk,
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
