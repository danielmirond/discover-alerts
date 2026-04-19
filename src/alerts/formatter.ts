import type { Alert } from '../types.js';
import { pickFormulasWithMeta } from './headline-formulas.js';
import { momentumIcon, momentumLabel } from '../analysis/velocity.js';
import { getState, updateState } from '../state/store.js';
import { checkImage } from '../analysis/image-check.js';

const FORMULA_USAGE_RETENTION_MS = 30 * 24 * 3600_000; // 30 days
const FORMULA_USAGE_MAX_ENTRIES = 5000;

function entityNameOf(a: Alert): string | undefined {
  switch (a.type) {
    case 'entity':
    case 'entity_coverage':
    case 'entity_concordance':
    case 'triple_match':
    case 'own_media_absent':
      return (a as any).entityName || (a as any).name;
    case 'trends_without_discover':
      return (a as any).trendTitle;
    case 'multi_entity_article':
      return (a as any).articleTitle;
    case 'category':
      return (a as any).name;
    case 'headline_pattern':
      return (a as any).ngram;
    default:
      return undefined;
  }
}

function entityScoreOf(a: Alert): number | undefined {
  if ('score' in a && typeof (a as any).score === 'number') return (a as any).score;
  return undefined;
}

function recordFormulaUsage(alert: Alert, matchKey: string): void {
  try {
    const state = getState();
    const existing = state.formulaUsage || [];
    const nowMs = Date.now();
    // Append + prune expired + cap
    const entry = {
      matchKey,
      alertType: alert.type,
      alertSubtype: (alert as any).subtype,
      alertTopic: (alert as any).topic,
      entityName: entityNameOf(alert),
      entityScore: entityScoreOf(alert),
      timestamp: new Date().toISOString(),
    };
    const fresh = existing.filter(e => nowMs - new Date(e.timestamp).getTime() <= FORMULA_USAGE_RETENTION_MS);
    fresh.push(entry);
    const capped = fresh.length > FORMULA_USAGE_MAX_ENTRIES
      ? fresh.slice(fresh.length - FORMULA_USAGE_MAX_ENTRIES)
      : fresh;
    updateState({ formulaUsage: capped });
  } catch {
    // Never let tracking break alert emission
  }
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  fields?: { type: string; text: string }[];
  elements?: { type: string; text: string }[];
}

function header(text: string): SlackBlock {
  return { type: 'header', text: { type: 'plain_text', text, emoji: true } };
}

function section(mrkdwn: string): SlackBlock {
  return { type: 'section', text: { type: 'mrkdwn', text: mrkdwn } };
}

function fields(...pairs: string[]): SlackBlock {
  return {
    type: 'section',
    fields: pairs.map((t: any) => ({ type: 'mrkdwn', text: t })),
  };
}

function context(text: string): SlackBlock {
  return { type: 'context', elements: [{ type: 'mrkdwn', text }] };
}

function divider(): SlackBlock {
  return { type: 'divider' };
}

/** Bloque "Así lo cuentan" con hasta 3 snippets reales de contexto. */
function contextSnippetsBlock(snippets: string[] | undefined): SlackBlock | null {
  if (!snippets || snippets.length === 0) return null;
  const lines = snippets.slice(0, 3).map(s => `• ${s}`).join('\n');
  return section(`:newspaper: *Así lo cuentan (contexto real):*\n${lines}`);
}

/**
 * Renderiza la imagen que Google Discover está mostrando (si viene en la
 * alerta) con un chequeo técnico de cumplimiento Discover debajo.
 * Devuelve 0-2 bloques: el `image` bloque + un `context` con el verdict.
 */
async function imageBlocks(
  url: string | undefined,
  alt: string | undefined,
  precomputed: import('../types.js').ImageCheck | undefined,
): Promise<SlackBlock[]> {
  if (!url) return [];
  const blocks: SlackBlock[] = [];
  const safeAlt = (alt || 'imagen Discover').slice(0, 1999);
  // Slack requires https + accessible URLs. DiscoverSnoop cache URLs son https.
  blocks.push({ type: 'image', image_url: url, alt_text: safeAlt } as any);

  let check = precomputed;
  if (!check) {
    try {
      check = await Promise.race([
        checkImage(url),
        new Promise<undefined>(res => setTimeout(() => res(undefined), 5000)),
      ]);
    } catch { /* noop */ }
  }
  if (check) {
    const parts: string[] = [];
    if (check.width && check.height) {
      parts.push(`${check.width}×${check.height}`);
      if (check.aspectRatio) parts.push(`ratio ${check.aspectRatio}`);
    }
    if (check.verdict) {
      const icon = check.verdict === 'apta' ? ':white_check_mark:' :
                   check.verdict === 'revisar' ? ':warning:' : ':x:';
      parts.push(`${icon} Discover: ${check.verdict}`);
    }
    if (check.notes && check.notes.length > 0) parts.push(check.notes.slice(0, 2).join(' · '));
    if (parts.length > 0) blocks.push(context(parts.join(' | ')));
  }
  return blocks;
}

async function formatEntity(a: Extract<Alert, { type: 'entity' }>): Promise<SlackBlock[]> {
  const emoji =
    a.subtype === 'new' ? ':new:' :
    a.subtype === 'flash' ? ':zap:' :
    a.subtype === 'discover_1h' ? ':zap:' :
    a.subtype === 'discover_3h' ? ':fire:' :
    a.subtype === 'discover_12h' ? ':rocket:' :
    a.subtype === 'longtail' ? ':fire:' :
    a.subtype === 'spike' ? ':fire:' :
    a.subtype === 'ascending' ? ':rocket:' :
    ':chart_with_upwards_trend:';
  const label =
    a.subtype === 'new' ? 'Nueva entidad' :
    a.subtype === 'flash' ? 'Entidad FLASH (1h)' :
    a.subtype === 'discover_1h' ? 'Discover 3+/1h' :
    a.subtype === 'discover_3h' ? 'Discover 5+/3h' :
    a.subtype === 'discover_12h' ? 'Discover 7+/12h' :
    a.subtype === 'longtail' ? 'Entidad LONGTAIL (2h)' :
    a.subtype === 'spike' ? 'Entidad en SPIKE' :
    a.subtype === 'ascending' ? 'Entidad en ascenso' :
    'Entidad en subida';
  const scoreDiff = a.score - a.prevScore;
  const posDiff = a.prevPosition > 0 ? a.prevPosition - a.position : 0;

  const baseFields = [
    `*Score:* ${a.score}${a.prevScore ? ` (+${scoreDiff})` : ''}`,
    `*Posicion:* #${a.position}${posDiff > 0 ? ` (:arrow_up: ${posDiff})` : ''}`,
    `*Publicaciones:* ${a.publications}`,
    `*Visto:* ${a.firstviewed}`,
  ];

  if (
    (a.subtype === 'ascending' ||
     a.subtype === 'longtail' ||
     a.subtype === 'spike' ||
     a.subtype === 'flash' ||
     a.subtype === 'discover_1h' ||
     a.subtype === 'discover_3h' ||
     a.subtype === 'discover_12h') &&
    a.appearanceCount != null
  ) {
    baseFields.push(
      `*Apariciones:* ${a.appearanceCount} en ${a.windowHours}h`,
    );
  }

  const blocks: SlackBlock[] = [
    header(`${emoji} ${label}: ${a.name}`),
    fields(...baseFields),
  ];

  // Velocity / momentum indicator
  if (a.velocity) {
    const v = a.velocity;
    blocks.push(context(
      `${momentumIcon(v.momentum)} *${momentumLabel(v.momentum)}* — ` +
      `v1h=${v.v1h} · v3h=${v.v3hRate.toFixed(1)}/h · v12h=${v.v12hRate.toFixed(1)}/h · ` +
      `acc=${v.acceleration.toFixed(2)}×`,
    ));
  }

  // Contexto real: snippets de Discover + descripciones RSS donde aparece la entidad
  const ctxBlock = contextSnippetsBlock(a.contextSnippets);
  if (ctxBlock) blocks.push(ctxBlock);

  // Imagen que Google Discover muestra para esta entidad, con chequeo tecnico
  if (a.imageUrl) {
    const imgBlks = await imageBlocks(a.imageUrl, a.imageAlt, a.imageCheck);
    blocks.push(...imgBlks);
  }

  // Enrichment: matching Google Trends
  if (a.matchingTrends && a.matchingTrends.length > 0) {
    const trendLines = a.matchingTrends
      .map((t: any) => `• *${t.title}*${t.approxTraffic > 0 ? ` — ${t.approxTraffic.toLocaleString()}+ busquedas` : ''}`)
      .join('\n');
    blocks.push(section(`:link: *Google Trends:*\n${trendLines}`));
  }

  // Enrichment: matching X/Twitter trends
  if (a.matchingXTrends && a.matchingXTrends.length > 0) {
    const xLines = a.matchingXTrends
      .map((t: any) => `• <${t.url}|${t.topic}> — #${t.rank} en X`)
      .join('\n');
    blocks.push(section(`:bird: *X/Twitter Trends:*\n${xLines}`));
  }

  // Enrichment: matching media articles
  if (a.matchingArticles && a.matchingArticles.length > 0) {
    const articleLines = a.matchingArticles
      .map((m: any) => `• <${m.link}|${m.title}> _(${m.feedName})_`)
      .join('\n');
    blocks.push(section(`:newspaper: *Medios publicando:*\n${articleLines}`));
  }

  blocks.push(context('DiscoverSnoop LiveEntities | ES'));
  return blocks;
}

function formatCategory(a: Extract<Alert, { type: 'category' }>): SlackBlock[] {
  const scoreDiff = a.score - a.prevScore;
  const pubPct = a.prevPublications > 0
    ? Math.round(((a.publications - a.prevPublications) / a.prevPublications) * 100)
    : 0;

  const emoji = a.subtype === 'day_spike' ? ':rotating_light:' : ':bar_chart:';
  const label = a.subtype === 'day_spike'
    ? `Spike 24h en categoria: ${a.name}`
    : `Spike en categoria: ${a.name}`;

  const baseline = a.subtype === 'day_spike'
    ? `Score *+${scoreDiff}* en las ultimas *${a.windowHours}h* (de ${a.prevScore} a ${a.score})`
    : `Score *+${scoreDiff}* (de ${a.prevScore} a ${a.score})`;

  const blocks: SlackBlock[] = [
    header(`${emoji} ${label}`),
    section(
      `${baseline}\n` +
      `Publicaciones: *${a.publications}*${pubPct > 0 ? ` (+${pubPct}%)` : ''}\n` +
      `Posicion: #${a.position}${a.prevPosition !== a.position ? ` (era #${a.prevPosition})` : ''}`,
    ),
  ];

  if (a.examplePages && a.examplePages.length > 0) {
    const lines = a.examplePages
      .map((p: any) => `• <${p.url}|${p.title}>${p.publisher ? ` _(${p.publisher})_` : ''}`)
      .join('\n');
    blocks.push(section(`:newspaper: *Ejemplos de noticias:*\n${lines}`));
  }

  blocks.push(context('DiscoverSnoop LiveCategories | ES'));
  return blocks;
}

function formatHeadline(a: Extract<Alert, { type: 'headline_pattern' }>): SlackBlock[] {
  const titles = a.matchingTitles.map((t: any) => `• ${t}`).join('\n');
  return [
    header(`:newspaper: Patron de titular detectado`),
    section(
      `*Patron:* "${a.ngram}"\n` +
      `*Frecuencia:* ${a.count} titulos${a.prevCount > 0 ? ` (antes: ${a.prevCount})` : ' (nuevo)'}`,
    ),
    section(`*Titulos coincidentes:*\n${titles}`),
    context('DiscoverSnoop LivePages | ES'),
  ];
}

function formatCorrelation(a: Extract<Alert, { type: 'trends_correlation' }>): SlackBlock[] {
  const parts: string[] = [];
  parts.push(`*Trending search:* ${a.trendTitle}`);
  parts.push(`*Trafico aprox:* ${a.approxTraffic.toLocaleString()}+`);

  if (a.matchingEntities.length > 0) {
    parts.push(`*Entidades Discover:* ${a.matchingEntities.join(', ')}`);
  }
  if (a.matchingPageTitles.length > 0) {
    parts.push(`*Paginas Discover:*\n${a.matchingPageTitles.map((t: any) => `• ${t}`).join('\n')}`);
  }

  return [
    header(`:link: Google Trends <-> Discover`),
    section(parts.join('\n')),
    context(`Similitud: ${(a.similarityScore * 100).toFixed(0)}% | Google Trends ES + DiscoverSnoop ES`),
  ];
}

function formatNewTrend(a: Extract<Alert, { type: 'trends_new_topic' }>): SlackBlock[] {
  const news = a.newsItems
    .map((n: any) => `• <${n.url}|${n.title}> (${n.source})`)
    .join('\n');

  return [
    header(`:fire: Nuevo trending en Google: ${a.title}`),
    fields(
      `*Trafico aprox:* ${a.approxTraffic.toLocaleString()}+`,
      `*Noticias:* ${a.newsItems.length}`,
    ),
    ...(news ? [section(news)] : []),
    context('Google Trends RSS | ES'),
  ];
}

function formatConcordance(a: Extract<Alert, { type: 'entity_concordance' }>): SlackBlock[] {
  const labelMap: Record<typeof a.subtype, { icon: string; label: string }> = {
    discover_trends_x: { icon: ':boom:', label: 'TRIPLE MATCH: Discover + Trends + X' },
    discover_rss:      { icon: ':satellite:', label: 'Discover + Medios RSS' },
    discover_trends:   { icon: ':link:', label: 'Discover + Google Trends' },
    discover_x:        { icon: ':bird:', label: 'Discover + X/Twitter' },
  };
  const { icon, label } = labelMap[a.subtype];

  const blocks: SlackBlock[] = [
    header(`${icon} Concordancia: ${a.entityName}`),
    fields(
      `*Tipo:* ${label}`,
      `*Score:* ${a.score}`,
      `*Posicion:* #${a.position}`,
      `*Publicaciones:* ${a.publications}`,
    ),
  ];

  const ctx0 = contextSnippetsBlock(a.contextSnippets);
  if (ctx0) blocks.push(ctx0);

  if (a.matchingTrends.length > 0) {
    const lines = a.matchingTrends
      .map((t: any) => `• *${t.title}*${t.approxTraffic > 0 ? ` — ${t.approxTraffic.toLocaleString()}+ busquedas` : ''}`)
      .join('\n');
    blocks.push(section(`:link: *Google Trends:*\n${lines}`));
  }

  if (a.matchingXTrends.length > 0) {
    const lines = a.matchingXTrends
      .map((t: any) => `• <${t.url}|${t.topic}> — #${t.rank} en X`)
      .join('\n');
    blocks.push(section(`:bird: *X/Twitter:*\n${lines}`));
  }

  if (a.matchingArticles.length > 0) {
    const lines = a.matchingArticles
      .map((m: any) => `• <${m.link}|${m.title}> _(${m.feedName})_`)
      .join('\n');
    blocks.push(section(`:newspaper: *Medios:*\n${lines}`));
  }

  blocks.push(context(`Cross-source concordance | DiscoverSnoop ES`));
  return blocks;
}

function formatEntityCoverage(a: Extract<Alert, { type: 'entity_coverage' }>): SlackBlock[] {
  const outletList = a.mediaOutlets.join(' • ');
  const articleLines = a.articles
    .map((art: any) => {
      const tag = art.feedScope === 'internacional' ? ' :globe_with_meridians:' : '';
      return `• <${art.link}|${art.title}> _(${art.feedName})_${tag}`;
    })
    .join('\n');

  const hasInternational = a.articles.some((art: any) => art.feedScope === 'internacional');
  const scopeNote = hasInternational ? ' (incluye medios internacionales)' : '';

  const ctxEC = contextSnippetsBlock(a.contextSnippets);
  const blocks: SlackBlock[] = [
    header(`:satellite: ${a.entityName}: publicada ${a.coverageCount} veces`),
    fields(
      `*Entidad:* ${a.entityName}`,
      `*Publicaciones:* ${a.coverageCount}${scopeNote}`,
      `*Medios (${a.mediaOutlets.length}):* ${outletList}`,
    ),
  ];
  if (ctxEC) blocks.push(ctxEC);
  blocks.push(section(`*Titulares:*\n${articleLines}`));
  blocks.push(context(`Cobertura mediatica | DiscoverSnoop + RSS medios`));
  return blocks;
}

function formatOwnMedia(a: Extract<Alert, { type: 'own_media' }>): SlackBlock[] {
  const labels: Record<typeof a.subtype, { icon: string; label: string }> = {
    discover_page: { icon: ':star2:', label: 'NUESTRO medio en Google Discover' },
    trends_news:   { icon: ':star2:', label: 'NUESTRO medio en Google Trends' },
    coverage_join: { icon: ':satellite:', label: 'NUESTRO medio en cobertura conjunta' },
  };
  const { icon, label } = labels[a.subtype];

  const blocks: SlackBlock[] = [
    header(`${icon} ${label}`),
  ];

  if (a.url) {
    blocks.push(section(`*<${a.url}|${a.title}>* _(${a.ownDomain})_`));
  } else {
    blocks.push(section(`*${a.title}* _(${a.ownDomain})_`));
  }

  const extras: string[] = [];
  if (a.score != null) extras.push(`*Score Discover:* ${a.score}`);
  if (a.position != null) extras.push(`*Posicion:* #${a.position}`);
  if (a.trendTopic) extras.push(`*Topic Trends:* ${a.trendTopic}`);
  if (a.category) extras.push(`*Categoria:* ${a.category}`);
  if (extras.length > 0) blocks.push(fields(...extras));

  if (a.otherOutlets && a.otherOutlets.length > 0) {
    blocks.push(section(
      `:newspaper: *Tambien cubierto por:* ${a.otherOutlets.join(', ')}`,
    ));
  }

  blocks.push(context('Own media tracking | Discover Alerts'));
  return blocks;
}

function formatOwnMediaAbsent(a: Extract<Alert, { type: 'own_media_absent' }>): SlackBlock[] {
  const blocks: SlackBlock[] = [
    header(`:warning: NO cubrimos: ${a.entityName}`),
    fields(
      `*Entidad:* ${a.entityName}`,
      `*Categoria:* ${a.category || 'sin categoria'}`,
      `*Medios que SI cubren:* ${a.otherOutlets.length}`,
    ),
  ];
  const ctxOMA = contextSnippetsBlock(a.contextSnippets);
  if (ctxOMA) blocks.push(ctxOMA);
  if (a.otherOutlets.length > 0) {
    blocks.push(section(`:newspaper: *Cubierto por:* ${a.otherOutlets.join(', ')}`));
  }
  if (a.otherTitles.length > 0) {
    blocks.push(section(
      `*Titulares de la competencia:*\n` + a.otherTitles.map((t: any) => `• ${t}`).join('\n'),
    ));
  }
  blocks.push(context('Own media absent | Oportunidad editorial'));
  return blocks;
}

function formatTrendsWithoutDiscover(a: Extract<Alert, { type: 'trends_without_discover' }>): SlackBlock[] {
  const newsLines = a.newsItems
    .map((n: any) => `• <${n.url}|${n.title}> _(${n.source})_`)
    .join('\n');
  const blocks: SlackBlock[] = [
    header(`:mag: Hueco SEO: ${a.trendTitle}`),
    section(
      `La gente busca *${a.trendTitle}* (~${a.approxTraffic.toLocaleString()}+ busquedas) pero ningun articulo en Discover ES ni entidad DiscoverSnoop lo cubre.`,
    ),
  ];
  const ctxTW = contextSnippetsBlock(a.contextSnippets);
  if (ctxTW) blocks.push(ctxTW);
  if (newsLines) blocks.push(section(`*Articulos en Google Trends:*\n${newsLines}`));
  blocks.push(context('Trends without Discover | SEO opportunity'));
  return blocks;
}

function formatHeadlineCluster(a: Extract<Alert, { type: 'headline_cluster' }>): SlackBlock[] {
  return [
    header(`:rotating_light: EVENTO GRANDE: ${a.entitiesInCluster.length} entidades activas`),
    section(
      `${a.entitiesInCluster.length} entidades distintas han disparado actividad en la ultima ${a.windowHours}h. Posible evento noticia grande en curso.`,
    ),
    section(`*Entidades en el cluster:*\n${a.entitiesInCluster.map((e: any) => `• ${e}`).join('\n')}`),
    context('Headline cluster | Big-event signal'),
  ];
}

function formatBoeCorrelation(a: Extract<Alert, { type: 'boe_discover_correlation' }>): SlackBlock[] {
  const parts: string[] = [];
  const linkText = a.boeUrl
    ? `<${a.boeUrl}|${a.boeTitle}>`
    : a.boeTitle;
  parts.push(`*Publicacion BOE:* ${linkText}`);
  if (a.boeId) parts.push(`*ID:* ${a.boeId}`);
  if (a.departamento) parts.push(`*Departamento:* ${a.departamento}`);
  if (a.seccion) parts.push(`*Seccion:* ${a.seccion}`);

  if (a.matchingEntities.length > 0) {
    parts.push(`*Entidades Discover:* ${a.matchingEntities.join(', ')}`);
  }
  if (a.matchingPageTitles.length > 0) {
    parts.push(`*Paginas Discover:*\n${a.matchingPageTitles.map((t: any) => `• ${t}`).join('\n')}`);
  }

  return [
    header(`:classical_building: BOE <-> Discover`),
    section(parts.join('\n')),
    context(`Similitud: ${(a.similarityScore * 100).toFixed(0)}% | BOE + DiscoverSnoop ES`),
  ];
}

function formatTripleMatch(a: Extract<Alert, { type: 'triple_match' }>): SlackBlock[] {
  const blocks: SlackBlock[] = [
    header(`:boom: TRIPLE MATCH: ${a.entityName}`),
    section(
      `*${a.entityName}* domina las 3 fuentes simultaneamente — tema de maximo impacto editorial AHORA MISMO.`,
    ),
    fields(
      `*Score Discover:* ${a.score} (#${a.position})`,
      `*Trafico Trends:* ~${a.totalTrafficEstimate.toLocaleString()}+ busquedas`,
      `*Mejor rank X:* #${a.bestXRank}`,
      `*Medios cubriendo:* ${a.outletCount}`,
    ),
  ];

  const ctxTM = contextSnippetsBlock(a.contextSnippets);
  if (ctxTM) blocks.push(ctxTM);

  if (a.matchingTrends.length > 0) {
    const lines = a.matchingTrends
      .map((t: any) => `• *${t.title}*${t.approxTraffic > 0 ? ` — ${t.approxTraffic.toLocaleString()}+ busquedas` : ''}`)
      .join('\n');
    blocks.push(section(`:mag: *Google Trends:*\n${lines}`));
  }

  if (a.matchingXTrends.length > 0) {
    const lines = a.matchingXTrends
      .map((t: any) => `• <${t.url}|${t.topic}> — #${t.rank} en X`)
      .join('\n');
    blocks.push(section(`:bird: *X/Twitter:*\n${lines}`));
  }

  if (a.matchingArticles.length > 0) {
    const lines = a.matchingArticles
      .slice(0, 5)
      .map((m: any) => `• <${m.link}|${m.title}> _(${m.feedName})_`)
      .join('\n');
    blocks.push(section(`:newspaper: *Medios:*\n${lines}`));
  }

  const ctx: string[] = ['Triple Match | Discover + Trends + X'];
  if (a.category) ctx.push(`Cat: ${a.category}`);
  if (a.topic) ctx.push(`Topic: ${a.topic}`);
  blocks.push(context(ctx.join(' | ')));
  return blocks;
}

function formatMultiEntityArticle(a: Extract<Alert, { type: 'multi_entity_article' }>): SlackBlock[] {
  const scopeTag = a.feedScope === 'internacional' ? ' :globe_with_meridians: *INTERNACIONAL*' : '';
  const blocks: SlackBlock[] = [
    header(`:card_index_dividers: Multi-entidad: ${a.entities.length} entidades en 1 articulo`),
    section(
      `*<${a.articleLink}|${a.articleTitle}>* _(${a.feedName})_${scopeTag}`,
    ),
  ];
  const ctxME = contextSnippetsBlock(a.contextSnippets);
  if (ctxME) blocks.push(ctxME);
  blocks.push(section(
    `*Entidades detectadas:* ${a.entities.join(', ')}` +
    (a.category ? `\n*Categoria DS:* ${a.category}` : ''),
  ));
  blocks.push(context(`Multi-entity article | ${a.feedCategory || 'media'} | ${a.feedScope || 'nacional'}`));
  return blocks;
}

function formatStaleData(a: Extract<Alert, { type: 'stale_data' }>): SlackBlock[] {
  return [
    header(`:warning: Pipeline sin actividad: ${a.source}`),
    section(
      `El poll *${a.source}* no ha corrido en los ultimos *${a.lastPollAgoMinutes} minutos*.\n` +
      `Revisa GitHub Actions, Upstash Redis y las credenciales del source.`,
    ),
    context('Stale data | Health check'),
  ];
}

function formatMeneameHot(a: Extract<Alert, { type: 'meneame_hot' }>): SlackBlock[] {
  const discoverNote = a.discoverAbsent
    ? ':warning: *Aún no aparece en Discover — posible adelantamiento*'
    : `:link: También en Discover: ${a.matchingDiscoverEntities.join(', ')}`;
  return [
    header(`:fire: Viral en Menéame: ${a.title.slice(0, 100)}`),
    fields(
      `*Karma:* ${a.karma}`,
      `*Votos:* ${a.votes}`,
      `*Comentarios:* ${a.comments}`,
      `*Sub:* ${a.sub || '-'}`,
    ),
    section(
      `${discoverNote}\n\n<${a.storyUrl}|Ver en Menéame> · <${a.externalUrl}|Fuente original>`,
    ),
    context(`Menéame upstream signal | ${new Date(a.pubDate).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`),
  ];
}

function formatWikipediaSurge(a: Extract<Alert, { type: 'wikipedia_surge' }>): SlackBlock[] {
  const discoverNote = a.discoverAbsent
    ? ':warning: *Aún no aparece en Discover — posible adelantamiento*'
    : `:link: También en Discover: ${a.matchingDiscoverEntities.join(', ')}`;
  return [
    header(`:books: Wikipedia ES: edit surge en "${a.title}"`),
    fields(
      `*Edits:* ${a.editCount}`,
      `*Editores únicos:* ${a.uniqueEditors}`,
      `*Ventana:* ${a.windowMinutes} min`,
      `*Artículo:* <${a.url}|Wikipedia>`,
    ),
    section(discoverNote),
    context('Wikipedia recent-changes | spike de ediciones ≥ umbral'),
  ];
}

function formatFirstMover(a: Extract<Alert, { type: 'first_mover' }>): SlackBlock[] {
  const wirePrefix = a.isWire ? ':newspaper: WIRE · ' : '';
  const wireContext = a.isWire
    ? ' · AGENCIA PRIMARIA (EFE/Europa Press/Reuters) — los medios citarán esto en 15-60 min'
    : ' · decidir entrar o saltar con fuentes propias';
  return [
    header(`${a.isWire ? ':newspaper:' : ':dart:'} ${wirePrefix}Exclusiva de ${a.feedName}: ${a.entityName}`),
    section(
      `Solo *${a.feedName}* publica sobre *${a.entityName}* en los últimos ${a.windowMinutes} min.\n` +
      `<${a.link}|${a.title}>`,
    ),
    context(
      `${a.isWire ? 'Wire first' : 'First mover'} | ${a.category || '-'}${a.topic ? ' · ' + a.topic : ''}${wireContext}`,
    ),
  ];
}

async function formatSingleAlert(alert: Alert) {
  switch (alert.type) {
    case 'entity': return await formatEntity(alert);
    case 'category': return formatCategory(alert);
    case 'headline_pattern': return formatHeadline(alert);
    case 'trends_correlation': return formatCorrelation(alert);
    case 'trends_new_topic': return formatNewTrend(alert);
    case 'boe_discover_correlation': return formatBoeCorrelation(alert);
    case 'entity_coverage': return formatEntityCoverage(alert);
    case 'entity_concordance': return formatConcordance(alert);
    case 'triple_match': return formatTripleMatch(alert);
    case 'own_media': return formatOwnMedia(alert);
    case 'own_media_absent': return formatOwnMediaAbsent(alert);
    case 'trends_without_discover': return formatTrendsWithoutDiscover(alert);
    case 'headline_cluster': return formatHeadlineCluster(alert);
    case 'stale_data': return formatStaleData(alert);
    case 'multi_entity_article': return formatMultiEntityArticle(alert);
    case 'meneame_hot': return formatMeneameHot(alert);
    case 'wikipedia_surge': return formatWikipediaSurge(alert);
    case 'first_mover': return formatFirstMover(alert);
  }
}

/**
 * Append a declarative "fórmulas sugeridas" context block at the end of the
 * alert's blocks if the headline-formulas.json has a matching rule. Also
 * records usage for later "qué fórmulas funcionaron" analytics.
 */
async function withFormulas(alert: Alert, blocks: SlackBlock[]): Promise<SlackBlock[]> {
  const picked = await pickFormulasWithMeta(alert);
  if (!picked || picked.lines.length === 0) return blocks;
  // Fire-and-forget record (sync on in-memory state; persisted by caller saveState())
  recordFormulaUsage(alert, picked.matchKey);
  const bullets = picked.lines.map(l => `_• ${l}_`).join('\n');
  const txt = `:pencil2: *Fórmulas sugeridas:*\n${bullets}`;
  return [...blocks, context(txt)];
}

export async function formatAlerts(alerts: Alert[]): Promise<{ blocks: SlackBlock[] }[]> {
  // Batch up to 5 alerts per message (Slack has 50 block limit)
  const messages: { blocks: SlackBlock[] }[] = [];
  const batchSize = 5;

  for (let i = 0; i < alerts.length; i += batchSize) {
    const batch = alerts.slice(i, i + batchSize);
    const blocks: SlackBlock[] = [];

    for (let j = 0; j < batch.length; j++) {
      if (j > 0) blocks.push(divider());
      const singleBlocks = await withFormulas(batch[j], (await formatSingleAlert(batch[j])) ?? []);
      blocks.push(...singleBlocks);
    }

    messages.push({ blocks });
  }

  return messages;
}

export function formatHeartbeat(): { blocks: SlackBlock[] } {
  const now = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
  return {
    blocks: [
      header(':robot_face: Discover Alerts arrancado'),
      section(
        `*Hora:* ${now}\n` +
        `*Pais:* ES\n` +
        `*Monitorizando:* Entidades, Categorias, Patrones de titular, Google Trends, RSS Medios, BOE`,
      ),
    ],
  };
}
