import type { Alert } from '../types.js';

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
  const emoji = a.subtype === 'new' ? ':new:' : ':chart_with_upwards_trend:';
  const label = a.subtype === 'new' ? 'Nueva entidad' : 'Entidad en subida';
  const scoreDiff = a.score - a.prevScore;
  const posDiff = a.prevPosition > 0 ? a.prevPosition - a.position : 0;

  return [
    header(`${emoji} ${label}: ${a.name}`),
    fields(
      `*Score:* ${a.score}${a.prevScore ? ` (+${scoreDiff})` : ''}`,
      `*Posicion:* #${a.position}${posDiff > 0 ? ` (:arrow_up: ${posDiff})` : ''}`,
      `*Publicaciones:* ${a.publications}`,
      `*Visto:* ${a.firstviewed}`,
    ),
    context('DiscoverSnoop LiveEntities | ES'),
  ];
}

function formatCategory(a: Extract<Alert, { type: 'category' }>): SlackBlock[] {
  const scoreDiff = a.score - a.prevScore;
  const pubPct = a.prevPublications > 0
    ? Math.round(((a.publications - a.prevPublications) / a.prevPublications) * 100)
    : 0;

  return [
    header(`:bar_chart: Spike en categoria: ${a.name}`),
    section(
      `Score *+${scoreDiff}* (de ${a.prevScore} a ${a.score})\n` +
      `Publicaciones: *${a.publications}*${pubPct > 0 ? ` (+${pubPct}%)` : ''}\n` +
      `Posicion: #${a.position}${a.prevPosition !== a.position ? ` (era #${a.prevPosition})` : ''}`,
    ),
    context('DiscoverSnoop LiveCategories | ES'),
  ];
}

function formatDomain(a: Extract<Alert, { type: 'domain' }>): SlackBlock[] {
  const emoji = a.subtype === 'new' ? ':globe_with_meridians:' : ':chart_with_upwards_trend:';
  const label = a.subtype === 'new' ? 'Nuevo dominio' : 'Spike en dominio';
  const scoreDiff = a.score - a.prevScore;
  const pubPct = a.prevPublications > 0
    ? Math.round(((a.publications - a.prevPublications) / a.prevPublications) * 100)
    : 0;

  return [
    header(`${emoji} ${label}: ${a.domain}`),
    fields(
      `*Score:* ${a.score}${a.prevScore ? ` (+${scoreDiff})` : ''}`,
      `*Posicion:* #${a.position}${a.prevPosition > 0 ? ` (era #${a.prevPosition})` : ''}`,
      `*Publicaciones:* ${a.publications}${pubPct > 0 ? ` (+${pubPct}%)` : ''}`,
    ),
    context('DiscoverSnoop LiveDomains | ES'),
  ];
}

function formatSocial(a: Extract<Alert, { type: 'social' }>): SlackBlock[] {
  const emoji = a.subtype === 'new' ? ':mega:' : ':chart_with_upwards_trend:';
  const label = a.subtype === 'new' ? 'Nuevo canal social' : 'Spike en canal social';
  const scoreDiff = a.score - a.prevScore;
  const pubPct = a.prevPublications > 0
    ? Math.round(((a.publications - a.prevPublications) / a.prevPublications) * 100)
    : 0;

  return [
    header(`${emoji} ${label}: ${a.channel}`),
    fields(
      `*Score:* ${a.score}${a.prevScore ? ` (+${scoreDiff})` : ''}`,
      `*Posicion:* #${a.position}${a.prevPosition > 0 ? ` (era #${a.prevPosition})` : ''}`,
      `*Publicaciones:* ${a.publications}${pubPct > 0 ? ` (+${pubPct}%)` : ''}`,
    ),
    context('DiscoverSnoop LiveSocial | ES'),
  ];
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

function formatMediaCorrelation(a: Extract<Alert, { type: 'media_discover_correlation' }>): SlackBlock[] {
  const parts: string[] = [];
  parts.push(`*Articulo:* <${a.articleLink}|${a.articleTitle}>`);
  parts.push(`*Medio:* ${a.feedName} (${a.feedCategory})`);

  if (a.matchingEntities.length > 0) {
    parts.push(`*Entidades Discover:* ${a.matchingEntities.join(', ')}`);
  }
  if (a.matchingPageTitles.length > 0) {
    parts.push(`*Paginas Discover:*\n${a.matchingPageTitles.map(t => `• ${t}`).join('\n')}`);
  }

  return [
    header(`:satellite: Medio <-> Discover: ${a.feedName}`),
    section(parts.join('\n')),
    context(`Similitud: ${(a.similarityScore * 100).toFixed(0)}% | ${a.feedCategory} + DiscoverSnoop ES`),
  ];
}

function formatSingleAlert(alert: Alert): SlackBlock[] {
  switch (alert.type) {
    case 'entity': return formatEntity(alert);
    case 'category': return formatCategory(alert);
    case 'domain': return formatDomain(alert);
    case 'social': return formatSocial(alert);
    case 'headline_pattern': return formatHeadline(alert);
    case 'trends_correlation': return formatCorrelation(alert);
    case 'trends_new_topic': return formatNewTrend(alert);
    case 'media_discover_correlation': return formatMediaCorrelation(alert);
  }
}

export function formatAlerts(alerts: Alert[]): { blocks: SlackBlock[] }[] {
  // Batch up to 5 alerts per message (Slack has 50 block limit)
  const messages: { blocks: SlackBlock[] }[] = [];
  const batchSize = 5;

  for (let i = 0; i < alerts.length; i += batchSize) {
    const batch = alerts.slice(i, i + batchSize);
    const blocks: SlackBlock[] = [];

    for (let j = 0; j < batch.length; j++) {
      if (j > 0) blocks.push(divider());
      blocks.push(...formatSingleAlert(batch[j]));
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
        `*Monitorizando:* Entidades, Categorias, Dominios, Canales sociales, Patrones de titular, Google Trends, RSS Medios`,
      ),
    ],
  };
}
