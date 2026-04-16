import type { Alert } from '../types.js';
import { buildFormulasContextText } from './headline-formulas.js';

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
    fields: pairs.map(t => ({ type: 'mrkdwn', text: t })),
  };
}

function context(text: string): SlackBlock {
  return { type: 'context', elements: [{ type: 'mrkdwn', text }] };
}

function divider(): SlackBlock {
  return { type: 'divider' };
}

function formatEntity(a: Extract<Alert, { type: 'entity' }>): SlackBlock[] {
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

  // Enrichment: matching Google Trends
  if (a.matchingTrends && a.matchingTrends.length > 0) {
    const trendLines = a.matchingTrends
      .map(t => `• *${t.title}*${t.approxTraffic > 0 ? ` — ${t.approxTraffic.toLocaleString()}+ busquedas` : ''}`)
      .join('\n');
    blocks.push(section(`:link: *Google Trends:*\n${trendLines}`));
  }

  // Enrichment: matching X/Twitter trends
  if (a.matchingXTrends && a.matchingXTrends.length > 0) {
    const xLines = a.matchingXTrends
      .map(t => `• <${t.url}|${t.topic}> — #${t.rank} en X`)
      .join('\n');
    blocks.push(section(`:bird: *X/Twitter Trends:*\n${xLines}`));
  }

  // Enrichment: matching media articles
  if (a.matchingArticles && a.matchingArticles.length > 0) {
    const articleLines = a.matchingArticles
      .map(m => `• <${m.link}|${m.title}> _(${m.feedName})_`)
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
      .map(p => `• <${p.url}|${p.title}>${p.publisher ? ` _(${p.publisher})_` : ''}`)
      .join('\n');
    blocks.push(section(`:newspaper: *Ejemplos de noticias:*\n${lines}`));
  }

  blocks.push(context('DiscoverSnoop LiveCategories | ES'));
  return blocks;
}

function formatHeadline(a: Extract<Alert, { type: 'headline_pattern' }>): SlackBlock[] {
  const titles = a.matchingTitles.map(t => `• ${t}`).join('\n');
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
    parts.push(`*Paginas Discover:*\n${a.matchingPageTitles.map(t => `• ${t}`).join('\n')}`);
  }

  return [
    header(`:link: Google Trends <-> Discover`),
    section(parts.join('\n')),
    context(`Similitud: ${(a.similarityScore * 100).toFixed(0)}% | Google Trends ES + DiscoverSnoop ES`),
  ];
}

function formatNewTrend(a: Extract<Alert, { type: 'trends_new_topic' }>): SlackBlock[] {
  const news = a.newsItems
    .map(n => `• <${n.url}|${n.title}> (${n.source})`)
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

  if (a.matchingTrends.length > 0) {
    const lines = a.matchingTrends
      .map(t => `• *${t.title}*${t.approxTraffic > 0 ? ` — ${t.approxTraffic.toLocaleString()}+ busquedas` : ''}`)
      .join('\n');
    blocks.push(section(`:link: *Google Trends:*\n${lines}`));
  }

  if (a.matchingXTrends.length > 0) {
    const lines = a.matchingXTrends
      .map(t => `• <${t.url}|${t.topic}> — #${t.rank} en X`)
      .join('\n');
    blocks.push(section(`:bird: *X/Twitter:*\n${lines}`));
  }

  if (a.matchingArticles.length > 0) {
    const lines = a.matchingArticles
      .map(m => `• <${m.link}|${m.title}> _(${m.feedName})_`)
      .join('\n');
    blocks.push(section(`:newspaper: *Medios:*\n${lines}`));
  }

  blocks.push(context(`Cross-source concordance | DiscoverSnoop ES`));
  return blocks;
}

function formatEntityCoverage(a: Extract<Alert, { type: 'entity_coverage' }>): SlackBlock[] {
  const outletList = a.mediaOutlets.join(' • ');
  const articleLines = a.articles
    .map(art => {
      const tag = art.feedScope === 'internacional' ? ' :globe_with_meridians:' : '';
      return `• <${art.link}|${art.title}> _(${art.feedName})_${tag}`;
    })
    .join('\n');

  const hasInternational = a.articles.some(art => art.feedScope === 'internacional');
  const scopeNote = hasInternational ? ' (incluye medios internacionales)' : '';

  return [
    header(`:satellite: ${a.entityName}: publicada ${a.coverageCount} veces`),
    fields(
      `*Entidad:* ${a.entityName}`,
      `*Publicaciones:* ${a.coverageCount}${scopeNote}`,
      `*Medios (${a.mediaOutlets.length}):* ${outletList}`,
    ),
    section(`*Titulares:*\n${articleLines}`),
    context(`Cobertura mediatica | DiscoverSnoop + RSS medios`),
  ];
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
  if (a.otherOutlets.length > 0) {
    blocks.push(section(`:newspaper: *Cubierto por:* ${a.otherOutlets.join(', ')}`));
  }
  if (a.otherTitles.length > 0) {
    blocks.push(section(
      `*Titulares de la competencia:*\n` + a.otherTitles.map(t => `• ${t}`).join('\n'),
    ));
  }
  blocks.push(context('Own media absent | Oportunidad editorial'));
  return blocks;
}

function formatTrendsWithoutDiscover(a: Extract<Alert, { type: 'trends_without_discover' }>): SlackBlock[] {
  const newsLines = a.newsItems
    .map(n => `• <${n.url}|${n.title}> _(${n.source})_`)
    .join('\n');
  return [
    header(`:mag: Hueco SEO: ${a.trendTitle}`),
    section(
      `La gente busca *${a.trendTitle}* (~${a.approxTraffic.toLocaleString()}+ busquedas) pero ningun articulo en Discover ES ni entidad DiscoverSnoop lo cubre.`,
    ),
    ...(newsLines ? [section(`*Articulos en Google Trends:*\n${newsLines}`)] : []),
    context('Trends without Discover | SEO opportunity'),
  ];
}

function formatHeadlineCluster(a: Extract<Alert, { type: 'headline_cluster' }>): SlackBlock[] {
  return [
    header(`:rotating_light: EVENTO GRANDE: ${a.entitiesInCluster.length} entidades activas`),
    section(
      `${a.entitiesInCluster.length} entidades distintas han disparado actividad en la ultima ${a.windowHours}h. Posible evento noticia grande en curso.`,
    ),
    section(`*Entidades en el cluster:*\n${a.entitiesInCluster.map(e => `• ${e}`).join('\n')}`),
    context('Headline cluster | Big-event signal'),
  ];
}

function formatMultiEntityArticle(a: Extract<Alert, { type: 'multi_entity_article' }>): SlackBlock[] {
  const scopeTag = a.feedScope === 'internacional' ? ' :globe_with_meridians: *INTERNACIONAL*' : '';
  return [
    header(`:card_index_dividers: Multi-entidad: ${a.entities.length} entidades en 1 articulo`),
    section(
      `*<${a.articleLink}|${a.articleTitle}>* _(${a.feedName})_${scopeTag}`,
    ),
    section(
      `*Entidades detectadas:* ${a.entities.join(', ')}` +
      (a.category ? `\n*Categoria DS:* ${a.category}` : ''),
    ),
    context(`Multi-entity article | ${a.feedCategory || 'media'} | ${a.feedScope || 'nacional'}`),
  ];
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

function formatSingleAlert(alert: Alert): SlackBlock[] {
  switch (alert.type) {
    case 'entity': return formatEntity(alert);
    case 'category': return formatCategory(alert);
    case 'headline_pattern': return formatHeadline(alert);
    case 'trends_correlation': return formatCorrelation(alert);
    case 'trends_new_topic': return formatNewTrend(alert);
    case 'entity_coverage': return formatEntityCoverage(alert);
    case 'entity_concordance': return formatConcordance(alert);
    case 'own_media': return formatOwnMedia(alert);
    case 'own_media_absent': return formatOwnMediaAbsent(alert);
    case 'trends_without_discover': return formatTrendsWithoutDiscover(alert);
    case 'headline_cluster': return formatHeadlineCluster(alert);
    case 'stale_data': return formatStaleData(alert);
    case 'multi_entity_article': return formatMultiEntityArticle(alert);
  }
}

/**
 * Append a declarative "fórmulas sugeridas" context block at the end of the
 * alert's blocks if the headline-formulas.json has a matching rule. Keeps
 * the existing per-alert formatters simple and synchronous.
 */
async function withFormulas(alert: Alert, blocks: SlackBlock[]): Promise<SlackBlock[]> {
  const txt = await buildFormulasContextText(alert);
  if (!txt) return blocks;
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
      const singleBlocks = await withFormulas(batch[j], formatSingleAlert(batch[j]));
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
        `*Monitorizando:* Entidades, Categorias, Patrones de titular, Google Trends, RSS Medios`,
      ),
    ],
  };
}
