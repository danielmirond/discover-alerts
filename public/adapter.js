/**
 * Traduce la respuesta de /api/live-alerts al shape que espera el mockup
 * Newsroom Live (window.DA_DATA). El mockup original (data.js) sirve de
 * fallback y como referencia de schema.
 *
 * Se ejecuta en navegador (vanilla JS, sin ES modules, sin types).
 */
(function () {
  'use strict';

  function timeAgoEs(isoOrDate) {
    const ts = typeof isoOrDate === 'string' ? new Date(isoOrDate).getTime() : isoOrDate;
    if (!ts || isNaN(ts)) return '—';
    const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diffSec < 60) return `hace ${diffSec}s`;
    if (diffSec < 3600) return `hace ${Math.floor(diffSec / 60)}m`;
    if (diffSec < 86400) return `hace ${Math.floor(diffSec / 3600)}h`;
    return `hace ${Math.floor(diffSec / 86400)}d`;
  }

  function secondsAgo(iso) {
    if (!iso) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  }

  function fmtTime(iso) {
    if (!iso) return '--:--';
    const d = new Date(iso);
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // ---------------- ALERTS ----------------
  const TYPE_LABEL = {
    triple_match: 'TRIPLE MATCH',
    entity: 'ENTIDAD',
    entity_coverage: 'COBERTURA',
    entity_concordance: 'CONCORDANCIA',
    trends_without_discover: 'HUECO SEO',
    own_media_absent: 'NO CUBRIMOS',
    multi_entity_article: 'MULTI-ENTIDAD',
    meneame_hot: 'MENÉAME HOT',
    wikipedia_surge: 'WIKIPEDIA SURGE',
    first_mover: 'PRIMICIA',
    headline_pattern: 'PATRÓN TITULAR',
    headline_cluster: 'EVENTO GRANDE',
    category: 'CATEGORÍA',
    us_relevant: 'USA→ES',
    stale_data: 'PIPELINE',
  };

  const SUBTYPE_LABEL = {
    flash: 'FLASH 1h',
    discover_1h: 'DISCOVER 1H',
    discover_3h: 'DISCOVER 3H',
    discover_12h: 'DISCOVER 12H',
    longtail: 'LONGTAIL',
    ascending: 'ASCENSO',
    rising: 'RISING',
  };

  function alertKind(recent) {
    // Para filtrar en la UI: usamos subtype si es entity, o type principal
    if (recent.type === 'entity' && recent.subtype) return recent.subtype;
    return recent.type || 'unknown';
  }

  function alertTypeLabel(recent) {
    if (recent.type === 'entity' && recent.subtype) return SUBTYPE_LABEL[recent.subtype] || recent.subtype.toUpperCase();
    return TYPE_LABEL[recent.type] || (recent.type || 'alert').toUpperCase();
  }

  /**
   * LiveRecentAlert (shape plano emitido por live-view.ts) trae:
   *   { type, subtype?, title, detail, timestamp, routeName, category?, examples? }
   * Para tipos recientes (first_mover, wikipedia_surge, meneame_hot) el
   * live-view aún deja title/detail vacíos — aquí les damos un fallback
   * razonable por tipo para que el feed sea legible hasta que arreglemos
   * backend.
   */
  function fallbackTitle(r) {
    if (r.title && r.title.trim()) return r.title;
    switch (r.type) {
      case 'first_mover': return 'Exclusiva detectada en un solo medio';
      case 'wikipedia_surge': return 'Surge de edits en Wikipedia ES';
      case 'meneame_hot': return 'Historia viral en Menéame';
      case 'headline_cluster': return 'Evento grande en curso';
      case 'stale_data': return 'Pipeline sin actividad';
      case 'trends_without_discover': return 'Hueco SEO activo';
      default: return '(sin título)';
    }
  }
  function fallbackDetail(r) {
    if (r.detail && r.detail.trim()) return r.detail;
    return '';
  }

  function velocityFromEntity(e) {
    if (e && e.velocity) {
      return {
        velocity: e.velocity.momentum || 'steady',
        velocityRatio: Number(e.velocity.acceleration) || 1,
      };
    }
    return { velocity: 'steady', velocityRatio: 1.0 };
  }

  function channelFromRoute(routeName) {
    if (!routeName || routeName === 'default') return '#discover-alerts';
    return '#discover-' + String(routeName).toLowerCase().replace(/\s+/g, '-');
  }

  function transformAlerts(api) {
    const recent = api.recentAlerts || [];
    // index entities para enriquecer con velocity + sources cuando exista
    const entitiesByName = {};
    for (const e of api.entities || []) entitiesByName[e.name] = e;

    return recent.slice(0, 200).map((r, idx) => {
      const headline = fallbackTitle(r);
      // Intentamos extraer entidad del title, o del detail si no hay
      const entityName = r.title || '';
      const ent = entityName ? entitiesByName[entityName] : null;
      const { velocity, velocityRatio } = velocityFromEntity(ent);
      const kind = alertKind(r);

      return {
        id: `a${idx}-${r.timestamp}`,
        ts: fmtTime(r.timestamp),
        ago: timeAgoEs(r.timestamp),
        type: kind,
        typeLabel: alertTypeLabel(r),
        velocity,
        velocityRatio,
        category: r.category || '—',
        channel: channelFromRoute(r.routeName),
        entity: entityName || '—',
        headline,
        snippet: fallbackDetail(r),
        discoverScore: ent ? ent.score : null,
        feedPos: ent ? ent.position : null,
        publications: ent ? ent.publications : 0,
        sources: {
          discover: Boolean(ent),
          trends: Boolean(ent && ent.matchingGoogleTrends && ent.matchingGoogleTrends.length > 0),
          twitter: Boolean(ent && ent.matchingXTrends && ent.matchingXTrends.length > 0),
          media: ent && ent.matchingArticles ? ent.matchingArticles.length : 0,
          meneame: kind === 'meneame_hot',
          wikipedia: kind === 'wikipedia_surge',
        },
        image: null,
        formulas: [], // el backend aún no persiste formulas por alerta
        related: (r.examples || []).slice(0, 4).map(e => e.source || e.title || '').filter(Boolean).slice(0, 4),
        // examples: lista de {title, url, source} — URLs clickables en la UI
        examples: (r.examples || []).slice(0, 5).map(e => ({
          title: e.title || '',
          url: e.url || '',
          source: e.source || '',
        })).filter(e => e.url),
      };
    });
  }

  // ---------------- POLLERS ----------------
  function transformPollers(api) {
    const out = [];
    const map = [
      { id: 'discoversnoop', label: 'DiscoverSnoop', cadence: 300, key: 'lastPollDiscover' },
      { id: 'trends', label: 'Google Trends', cadence: 1800, key: 'lastPollTrends' },
      { id: 'media', label: 'Media RSS', cadence: 900, key: 'lastPollMedia' },
      { id: 'twitter', label: 'X/Twitter', cadence: 1800, key: 'lastPollX' },
      // Menéame/Wikipedia no publican lastPoll en /api/live-alerts hoy → se marcan warn
      { id: 'meneame', label: 'Menéame', cadence: 1200, key: null },
      { id: 'wikipedia', label: 'Wikipedia ES', cadence: 900, key: null },
    ];
    for (const p of map) {
      const last = p.key ? secondsAgo(api[p.key]) : 0;
      const status = !p.key ? 'warn'
        : last === 0 ? 'warn'
        : (last > p.cadence * 2 ? 'warn' : 'ok');
      out.push({ id: p.id, label: p.label, cadence: p.cadence, last, status });
    }
    return out;
  }

  // ---------------- GAPS (opportunities) ----------------
  function transformGaps(api) {
    const kindMap = {
      hueco_seo: 'HUECO SEO',
      not_covering: 'NO CUBRIMOS',
      triple_match_fresh: 'TRIPLE MATCH',
      us_relevant: 'USA→ES',
    };
    return (api.opportunities || []).slice(0, 10).map(o => ({
      kind: kindMap[o.kind] || 'HUECO',
      entity: o.title,
      detail: o.detail,
      ago: o.lastSeen ? timeAgoEs(o.lastSeen) : 'ahora',
      score: o.priorityScore ? Math.round(o.priorityScore).toLocaleString() : '—',
    }));
  }

  // ---------------- ENTITIES ----------------
  function transformEntities(api) {
    const ents = (api.entities || []).slice(0, 12);
    return ents.map(e => {
      const v = e.velocity || { momentum: 'steady', acceleration: 1, v1h: e.appearancesLastHour || 0 };
      let trend = 'flat';
      if (v.momentum === 'rising' || v.momentum === 'peaking' || v.momentum === 'new') trend = 'up';
      if (v.momentum === 'fading') trend = 'down';
      const score = typeof e.score === 'number' ? e.score : 0;
      // momentum 0-100 para barra: clamp acceleration*50 con fallback score/100
      const momentum = Math.max(5, Math.min(100, Math.round((v.acceleration || 1) * 40 + (score / 2))));
      const deltaNum = (v.v1h || 0) - (v.v3hRate || 0);
      const delta = trend === 'up' ? `+${v.v1h || 0}/h`
        : trend === 'down' ? `−${Math.max(1, Math.round(Math.abs(deltaNum)))}/h`
        : `${v.v1h || 0}/h`;
      return {
        name: e.name,
        cat: e.category || '—',
        momentum,
        delta,
        trend,
      };
    });
  }

  // ---------------- SPIKES (categories) ----------------
  function transformSpikes(api) {
    return (api.categories || []).slice(0, 10).map(c => ({
      cat: c.name,
      delta: typeof c.scoreDelta24h === 'number' ? Math.round(c.scoreDelta24h) : 0,
    }));
  }

  // ---------------- CONCORDANCES ----------------
  function transformConcordances(api) {
    return (api.concordances || []).slice(0, 10).map(c => ({
      entity: c.entityName,
      discover: true,
      trends: (c.matchingTrends || []).length > 0,
      twitter: (c.matchingXTrends || []).length > 0,
      media: (c.matchingArticles || []).length,
      score: Math.round(c.score || 0),
    }));
  }

  // ---------------- TOP MEDIA ----------------
  function transformTopMedia(api) {
    const media = api.topMedia || [];
    const total = media.reduce((s, m) => s + (m.articleCount || 0), 0) || 1;
    return media.slice(0, 30).map(m => ({
      name: m.feedName,
      pubs: m.articleCount,
      share: Math.round((m.articleCount / total) * 100),
      topDiscoverPages: m.topDiscoverPages || [],
      entities: m.entities || [],
    }));
  }

  // ---------------- FORMULAS ----------------
  function tierFromScore(avg) {
    if (avg == null) return 'standard';
    if (avg >= 15) return 'winner';
    if (avg >= 8) return 'standard';
    return 'faltan_datos';
  }
  function verticalFromKey(matchKey) {
    // 'entity/flash+legal' → Legal; '+deportes' etc. Si sin topic → ver categoria
    const plus = matchKey.indexOf('+');
    if (plus === -1) return 'genérico';
    const topic = matchKey.slice(plus + 1);
    if (topic === '_') return 'genérico';
    return topic.charAt(0).toUpperCase() + topic.slice(1);
  }
  function transformFormulas(api) {
    return (api.formulasLast30d || []).slice(0, 10).map(f => ({
      id: f.matchKey,
      pattern: f.matchKey,
      vertical: verticalFromKey(f.matchKey),
      uses: f.count,
      tier: tierFromScore(f.avgEntityScore),
      avgReach: Math.max(1000, Math.round((f.avgEntityScore || 0) * 500)),
    }));
  }

  // ---------------- PATTERNS ----------------
  function transformPatterns(api) {
    const patterns = api.headlinePatterns4d || api.headlinePatterns || [];
    const total = patterns.reduce((s, p) => s + (p.totalCount || p.count || 1), 0) || 1;
    return patterns.slice(0, 10).map(p => {
      const count = p.totalCount || p.count || 0;
      const share = Math.round((count / total) * 100);
      return {
        pattern: p.ngram || p.pattern,
        share,
        delta: '+0',
      };
    });
  }

  // ---------------- WEEKLY ----------------
  function transformWeekly(api) {
    // weeklyHistorySummary trae { availableWeeks, feedNames }. No hay breakdown
    // por feed aún — generamos placeholder realistas con 0 para mantener visual.
    const feeds = (api.weeklyHistorySummary?.feedNames || []).slice(0, 8);
    return feeds.map(f => ({
      medium: f,
      w: [0, 0, 0, 0, 0, 0, 0],
    }));
  }

  // ---------------- MAIN ADAPTER ----------------
  /** Transforma la respuesta de /api/trends a items listos para el panel. */
  function transformTrendsRaw(payload) {
    const items = (payload && payload.trends) || [];
    return items.slice(0, 15).map(t => ({
      title: t.title,
      traffic: t.approxTraffic || 0,
      link: t.link,
      pubDate: t.pubDate,
      picture: t.picture,
      news: (t.newsItems || []).slice(0, 2).map(n => ({
        title: n.title,
        url: n.url,
        source: n.source,
      })),
    })).sort((a, b) => b.traffic - a.traffic);
  }

  /** Transforma /api/x-trends a lista de X/Twitter trends. */
  function transformXTrends(payload) {
    const items = (payload && payload.trends) || [];
    return items.slice(0, 30).map(t => ({
      rank: t.rank,
      topic: t.topic,
      url: t.url,
    }));
  }

  /** Transforma /api/boe a items BOE agrupados. */
  function transformBoe(payload) {
    if (!payload) return null;
    return {
      totalItems: payload.totalItems || 0,
      sections: (payload.sections || []).map(s => ({
        name: s.name,
        count: s.count,
        items: (s.items || []).slice(0, 20),
      })),
      fetchedAt: payload.fetchedAt,
    };
  }

  window.adaptApiToDashboard = function (api, trendsPayload, xTrendsPayload, boePayload) {
    if (!api) return null;
    return {
      now: new Date(),
      lastPoll: {
        discoversnoop: secondsAgo(api.lastPollDiscover),
        trends: secondsAgo(api.lastPollTrends),
        media: secondsAgo(api.lastPollMedia),
        twitter: secondsAgo(api.lastPollX),
        meneame: 0,
        wikipedia: 0,
      },
      pollers: transformPollers(api),
      alerts: transformAlerts(api),
      gaps: transformGaps(api),
      entities: transformEntities(api),
      spikes: transformSpikes(api),
      concordances: transformConcordances(api),
      topMedia: transformTopMedia(api),
      formulas: transformFormulas(api),
      headlinePatterns: transformPatterns(api),
      weekly: transformWeekly(api),
      trends: transformTrendsRaw(trendsPayload),
      xTrends: transformXTrends(xTrendsPayload),
      boe: transformBoe(boePayload),
      _totals: api.totals,
      _raw: api,
    };
  };

  /**
   * Orquesta el fetch + transform + set window.DA_DATA + dispatch evento.
   * Si falla, mantiene la data anterior (o el mock de fallback).
   */
  window.refreshDashboardData = async function () {
    try {
      const [liveRes, trendsRes, xRes, boeRes] = await Promise.allSettled([
        fetch('/api/live-alerts?t=' + Date.now(), { cache: 'no-store' }),
        fetch('/api/trends?t=' + Date.now(), { cache: 'no-store' }),
        fetch('/api/x-trends?t=' + Date.now(), { cache: 'no-store' }),
        fetch('/api/boe?t=' + Date.now(), { cache: 'no-store' }),
      ]);
      if (liveRes.status !== 'fulfilled' || !liveRes.value.ok) {
        throw new Error('live-alerts HTTP ' + (liveRes.value?.status || liveRes.reason));
      }
      const j = await liveRes.value.json();
      let trendsPayload = null;
      if (trendsRes.status === 'fulfilled' && trendsRes.value.ok) {
        try { trendsPayload = await trendsRes.value.json(); } catch {}
      }
      let xPayload = null;
      if (xRes.status === 'fulfilled' && xRes.value.ok) {
        try { xPayload = await xRes.value.json(); } catch {}
      }
      let boePayload = null;
      if (boeRes.status === 'fulfilled' && boeRes.value.ok) {
        try { boePayload = await boeRes.value.json(); } catch {}
      }
      const mapped = window.adaptApiToDashboard(j, trendsPayload, xPayload, boePayload);
      if (mapped) {
        window.DA_DATA = mapped;
        window.dispatchEvent(new CustomEvent('da-data-updated'));
        return mapped;
      }
    } catch (err) {
      console.warn('[adapter] refresh failed:', err && err.message);
    }
    return null;
  };
})();
