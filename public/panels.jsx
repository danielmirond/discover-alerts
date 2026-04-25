// Side panels

function GapsPanel({ gaps }) {
  const kindClass = { 'HUECO SEO': 'seo', 'NO CUBRIMOS': 'miss', 'TRIPLE MATCH': 'triple', 'USA→ES': 'us' };
  const list = gaps || [];
  return (
    <div className="panel">
      <div className="kicker">
        Huecos activos AHORA
        <Help>
          Oportunidades editoriales del momento que el sistema detecta en tiempo real.
          <br/><br/>
          <strong>Hueco SEO</strong>: un tema con +10.000 búsquedas en Google Trends que no aparece
          en Discover ni cubre ningún medio español. Tráfico libre si entras primero.<br/>
          <strong>No cubrimos</strong>: entidad cubierta por ≥3 medios competidores y tu dominio
          propio ausente.<br/>
          <strong>Triple match</strong>: entidad presente en Discover + Trends + X/Twitter con
          alta intensidad en los tres.<br/>
          <strong>USA→ES</strong>: trend US con cabida editorial española (cruza una entidad
          o medio español o clasifica en un topic).
        </Help>
        <span className="bar"></span>
        <span className="meta live" style={{ color: list.length > 0 ? 'var(--accent)' : 'var(--ink-4)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {list.length > 0 && (
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulse 1.4s infinite' }}></span>
          )}
          {list.length} activos
        </span>
      </div>
      {list.length === 0 && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)', padding: 8 }}>
          Sin huecos detectados en este poll.
        </div>
      )}
      {gaps.map((g, i) => (
        <div key={i} className="gap-row">
          <span className={`gap-kind ${kindClass[g.kind]}`}>{g.kind}</span>
          <div>
            <div className="entity">{g.entity}</div>
            <div className="detail">{g.detail} · {g.ago}</div>
          </div>
          <span className="score-chip">{g.score}</span>
        </div>
      ))}
    </div>
  );
}

function EntitiesPanel({ entities }) {
  return (
    <div className="panel">
      <div className="kicker">
        Entidades en vivo
        <Help>
          Una <strong>entidad</strong> es un tema, persona, organismo o evento que DiscoverSnoop
          está detectando en titulares. No confundir con <strong>medio</strong> (cabecera que
          publica) ni con <strong>topic</strong> (vertical editorial interno: sucesos, legal,
          política…).<br/><br/>
          El <strong>momentum</strong> es la aceleración: ratio de apariciones/hora en la última
          hora frente a las últimas 3 horas. <strong>Rising</strong> = acelerando,
          <strong> peaking</strong> = pico sostenido, <strong>fading</strong> = bajando.
        </Help>
        <span className="bar"></span>
        <span className="meta">momentum · últimas 60 min</span>
      </div>
      {entities.map((e, i) => (
        <EntityRow key={i} e={e} />
      ))}
    </div>
  );
}

function EntityRow({ e }) {
  // state.analyses es un mapa imageUrl → { loading, error, result }
  const [analyses, setAnalyses] = useState({});

  // Construir lista unificada de hasta 5 noticias asociadas:
  //   1) topPages (Discover, con imagen y score)
  //   2) si quedan slots, completar con matchingArticles (RSS) marcadas como kind:'rss'
  //   3) deduplicar por URL
  const newsList = (() => {
    const out = [];
    const seen = new Set();
    for (const p of (e.topPages || [])) {
      if (!p || !p.url || seen.has(p.url)) continue;
      seen.add(p.url);
      out.push({ kind: 'ds', url: p.url, title: p.title, image: p.image, score: p.score, source: 'Discover' });
      if (out.length >= 5) break;
    }
    if (out.length < 5 && e.imageUrl && e.topPageUrl && !seen.has(e.topPageUrl)) {
      seen.add(e.topPageUrl);
      out.push({ kind: 'ds', url: e.topPageUrl, title: e.topPageTitle, image: e.imageUrl, source: 'Discover' });
    }
    for (const a of (e.matchingArticles || [])) {
      if (out.length >= 5) break;
      if (!a || !a.link || seen.has(a.link)) continue;
      seen.add(a.link);
      out.push({ kind: 'rss', url: a.link, title: a.title, image: undefined, source: a.feedName });
    }
    return out;
  })();

  // Mantener topPages para el botón "ANALIZAR TODO" sobre las que tienen imagen
  const topPages = newsList.filter(n => n.image);

  const analyze = (page) => async (ev) => {
    ev.stopPropagation();
    const img = page.image;
    if (!img) return;
    const cur = analyses[img];
    if (cur && cur.loading) return;
    setAnalyses(a => ({ ...a, [img]: { loading: true, error: null, result: null } }));
    try {
      const params = new URLSearchParams({ url: img, entity: e.name });
      if (page.title) params.set('headline', page.title);
      const r = await fetch(`/api/image-analysis?${params}`, { credentials: 'same-origin' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const result = await r.json();
      setAnalyses(a => ({ ...a, [img]: { loading: false, error: null, result } }));
    } catch (ex) {
      setAnalyses(a => ({ ...a, [img]: { loading: false, error: String(ex.message || ex), result: null } }));
    }
  };

  const analyzeAll = async (ev) => {
    ev.stopPropagation();
    for (const p of topPages) await analyze(p)(ev);
  };

  const renderAnalysis = (img) => {
    const a = analyses[img];
    if (!a) return null;
    if (a.loading) return <span style={{ color: 'var(--ink-4)' }}>…</span>;
    if (a.error) return <span style={{ color: 'var(--danger)' }}>err {a.error}</span>;
    const r = a.result;
    if (r.error) return <span style={{ color: 'var(--warn)' }}>{r.error}</span>;
    const color = r.entityMatch >= 7 ? 'var(--ok)' : r.entityMatch >= 4 ? 'var(--warn)' : 'var(--danger)';
    return (
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)' }}>
        <div style={{ color: 'var(--ink)', fontSize: 11, lineHeight: 1.3 }}>{r.caption}</div>
        <div style={{ marginTop: 2 }}>
          <span style={{ color }}>{r.entityMatch}/10</span>
          {' · '}
          {r.brandSafe ? <span style={{ color: 'var(--ok)' }}>safe</span> : <span style={{ color: 'var(--danger)' }}>⚠</span>}
          {r.cached ? ' · cached' : ''}
        </div>
        {(r.notes || []).length > 0 && (
          <div style={{ color: 'var(--ink-4)', marginTop: 2, lineHeight: 1.4 }}>
            {(r.notes || []).map((n, i) => (
              <span key={i} style={{ display: 'inline-block', marginRight: 4, padding: '0 4px', background: 'var(--paper)', border: '1px solid var(--rule-2)' }}>{n}</span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="ent-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, padding: '12px 0' }}>
      {/* Header: nombre + tags + stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ent-name">
            {e.name}
            {e.category ? <span className="cat">{e.category}</span> : null}
            {e.topic ? <span className="cat" style={{ background: 'var(--warn)', color: 'var(--paper)', marginLeft: 4 }}>{e.topic}</span> : null}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)', marginTop: 2 }}>
            score {e.score} · pos #{e.position} · 1h:{e.appearancesLastHour} · 2h:{e.appearancesLast2h} · 6h:{e.appearancesLast6h} · {newsList.length} noticia{newsList.length === 1 ? '' : 's'}
          </div>
        </div>
        {topPages.length > 0 && (
          <button onClick={analyzeAll} style={{
            fontFamily: 'var(--mono)', fontSize: 10, padding: '4px 8px',
            border: '1px solid var(--rule)', background: 'var(--paper-3)',
            color: 'var(--ink)', cursor: 'pointer', flexShrink: 0, letterSpacing: '.05em',
          }}>ANALIZAR TODO</button>
        )}
      </div>
      {/* Grid de hasta 5 noticias mezclando Discover + RSS */}
      {newsList.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {newsList.map((p, i) => (
            <div key={p.url || i} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
              <a href={p.url || '#'} target="_blank" rel="noreferrer"
                 onClick={(ev) => ev.stopPropagation()}
                 style={{ position: 'relative', textDecoration: 'none', color: 'inherit' }}>
                {p.image ? (
                  <img src={p.image} alt={p.title}
                       title={p.title}
                       style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', border: '1px solid var(--rule)', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', aspectRatio: '16/9', border: '1px dashed var(--rule-2)', display: 'grid', placeItems: 'center', color: 'var(--ink-4)', fontSize: 10, fontFamily: 'var(--mono)' }}>
                    {p.kind === 'rss' ? 'RSS' : 'sin imagen'}
                  </div>
                )}
                <span style={{ position: 'absolute', top: 3, left: 3, padding: '1px 5px', background: p.kind === 'rss' ? 'var(--ink-3)' : 'var(--ink)', color: 'var(--paper)', fontFamily: 'var(--mono)', fontSize: 9 }}>
                  {p.kind === 'rss' ? 'RSS' : `#${i + 1}${p.score != null ? ' · s' + p.score : ''}`}
                </span>
              </a>
              <a href={p.url || '#'} target="_blank" rel="noreferrer"
                 onClick={(ev) => ev.stopPropagation()}
                 title={p.title}
                 style={{ fontSize: 12, color: 'var(--ink)', fontFamily: 'var(--sans)', lineHeight: 1.3, fontWeight: 500, textDecoration: 'none', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {p.title}
              </a>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', textTransform: 'lowercase' }}>
                {p.source || (p.kind === 'rss' ? 'rss' : 'discover')}
              </div>
              {p.image && (
                <button onClick={analyze(p)} title="Analizar imagen con IA"
                        style={{ fontFamily: 'var(--mono)', fontSize: 9, padding: '2px 5px', border: '1px solid var(--rule-2)', background: 'transparent', color: 'var(--ink-3)', cursor: 'pointer', alignSelf: 'flex-start' }}>
                  analizar
                </button>
              )}
              <div>{renderAnalysis(p.image)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
          Sin noticias asociadas en este momento.
        </div>
      )}
    </div>
  );
}

function TopMediaPanel({ media }) {
  const max = Math.max(...(media || []).map(m => m.pubs), 1);
  return (
    <div className="panel">
      <div className="kicker">
        Medios más activos
        <Help>
          Cabeceras RSS con más artículos en las últimas 12h + hasta 10 páginas suyas
          que entraron en Discover en las últimas 48h (ventana rolling). Son
          <strong> medios</strong> (ABC, El País, Marca…), no entidades.
        </Help>
        <span className="bar"></span>
        <span className="meta">RSS 12h · Discover rolling 48h · hasta 10 cards/medio</span>
      </div>
      {media.map((m, i) => (
        <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid var(--rule-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span className="rank" style={{ minWidth: 28 }}>{String(i + 1).padStart(2, '0')}</span>
            <span className="label" style={{ flex: 1, fontWeight: 600 }}>{m.name}</span>
            <div className="mini-bar" style={{ width: 60 }}>
              <div className="fill" style={{ width: `${(m.pubs / max) * 100}%` }}></div>
            </div>
            <span className="meta">
              <strong style={{ color: 'var(--ink)' }}>{m.pubs}</strong> pubs · {m.share}%
              {(m.topDiscoverPages || []).length > 0 && (
                <span style={{ marginLeft: 8, color: 'var(--accent)' }}>· {m.topDiscoverPages.length} en Discover</span>
              )}
              {(m.entities || []).length > 0 && (
                <span style={{ marginLeft: 8, color: 'var(--ink-3)' }}>· {m.entities.length} entidades</span>
              )}
            </span>
          </div>
          {(m.entities || []).length > 0 && (
            <div style={{ marginLeft: 38, marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {m.entities.slice(0, 12).map((e, j) => {
                // Señales DS/Trends/X que vienen del backend
                const signals = [];
                if (e.inGoogleTrends) signals.push('T');
                if (e.inXTrends) signals.push('X');
                const bg = e.inGoogleTrends || e.inXTrends ? 'var(--accent)' : 'var(--paper-3)';
                const fg = e.inGoogleTrends || e.inXTrends ? 'var(--paper)' : 'var(--ink-2)';
                return (
                  <span key={j}
                        title={`${e.name} · ${e.count} menciones${signals.length ? ' · cruza: ' + signals.join('+') : ''}`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          fontFamily: 'var(--mono)', fontSize: 10,
                          padding: '2px 6px',
                          background: bg, color: fg,
                          border: '1px solid var(--rule-2)',
                        }}>
                    {e.name}
                    <span style={{ opacity: 0.7 }}>×{e.count}</span>
                    {signals.length > 0 && <span style={{ opacity: 0.9, letterSpacing: 1 }}>{signals.join('')}</span>}
                  </span>
                );
              })}
            </div>
          )}
          {(m.topDiscoverPages || []).length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginLeft: 38 }}>
              {m.topDiscoverPages.map((p, j) => {
                // "hace Xh" desde firstSeen o lastUpdated
                const ts = p.firstSeen || p.lastUpdated;
                let ago = '';
                if (ts) {
                  const diffH = Math.max(0, (Date.now() - new Date(ts).getTime()) / 3600_000);
                  ago = diffH < 1 ? `${Math.round(diffH * 60)}m` : `${Math.round(diffH)}h`;
                }
                return (
                  <a key={p.url} href={p.url} target="_blank" rel="noreferrer"
                     title={p.title}
                     style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                    <div style={{ position: 'relative' }}>
                      {p.image ? (
                        <img src={p.image} alt={p.title}
                             style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', border: '1px solid var(--rule)', display: 'block' }} />
                      ) : (
                        <div style={{ width: '100%', aspectRatio: '16/9', border: '1px dashed var(--rule-2)', display: 'grid', placeItems: 'center', color: 'var(--ink-4)', fontSize: 10, fontFamily: 'var(--mono)' }}>
                          sin imagen
                        </div>
                      )}
                      <span style={{ position: 'absolute', top: 3, left: 3, padding: '1px 5px', background: 'var(--ink)', color: 'var(--paper)', fontFamily: 'var(--mono)', fontSize: 9 }}>
                        #{j + 1} · s{p.score}
                      </span>
                      {ago && (
                        <span style={{ position: 'absolute', top: 3, right: 3, padding: '1px 5px', background: 'var(--accent)', color: 'var(--paper)', fontFamily: 'var(--mono)', fontSize: 9 }}>
                          {ago}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink)', fontFamily: 'var(--sans)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontWeight: 500 }}>
                      {p.title}
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <div style={{ marginLeft: 38, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
              Sin páginas en Discover ahora mismo.
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CategoriesPanel({ categories }) {
  const all = [...(categories || [])].sort((a, b) => (b.score || 0) - (a.score || 0));
  // Agrupar por primer segmento del path DS (e.g. "/Sports/Team Sports/Soccer" → "Sports")
  const groups = React.useMemo(() => {
    const g = {};
    for (const c of all) {
      const name = c.name || '';
      const parts = name.split('/').filter(Boolean);
      const root = parts[0] || 'Otros';
      if (!g[root]) g[root] = [];
      g[root].push(c);
    }
    return g;
  }, [all]);
  const groupNames = React.useMemo(() => Object.keys(groups).sort((a, b) => {
    const sA = (groups[a][0]?.score || 0);
    const sB = (groups[b][0]?.score || 0);
    return sB - sA;
  }), [groups]);
  const [activeGroup, setActiveGroup] = useState(groupNames[0] || 'Otros');
  // Cuando cambia la lista (nuevo poll), seguir en activo si sigue existiendo
  useEffect(() => {
    if (!groupNames.includes(activeGroup) && groupNames[0]) setActiveGroup(groupNames[0]);
  }, [groupNames]);

  const cats = (groups[activeGroup] || []).slice(0, 20);

  return (
    <div className="panel">
      <div className="kicker">
        Categorías DiscoverSnoop
        <Help>
          Taxonomía oficial de Google Discover. Agrupadas por categoría raíz. Cada
          subcategoría muestra foto + titular de sus 10 páginas con mayor score + delta 24h.
        </Help>
        <span className="bar"></span>
        <span className="meta">{all.length} total · {groupNames.length} ejes</span>
      </div>

      {/* Subtabs por grupo raíz */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14, borderBottom: '1px solid var(--rule-2)', paddingBottom: 8 }}>
        {groupNames.map(g => (
          <span key={g} onClick={() => setActiveGroup(g)}
                style={{
                  cursor: 'pointer', padding: '4px 10px', fontFamily: 'var(--mono)', fontSize: 11,
                  border: '1px solid var(--rule)',
                  background: activeGroup === g ? 'var(--ink)' : 'transparent',
                  color: activeGroup === g ? 'var(--paper)' : 'var(--ink)',
                  letterSpacing: '.04em',
                }}>
            {g} <strong style={{ opacity: 0.7 }}>{groups[g].length}</strong>
          </span>
        ))}
      </div>

      {cats.length === 0 && (
        <div style={{ padding: 12, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-4)' }}>
          Sin subcategorías en "{activeGroup}".
        </div>
      )}
      {cats.map(c => {
        const topPages = c.topPages || [];
        const topEntities = c.topEntities || [];
        const delta = c.scoreDelta24h;
        const deltaColor = delta == null ? 'var(--ink-4)' : delta > 0 ? 'var(--ok)' : delta < 0 ? 'var(--danger)' : 'var(--ink-4)';
        return (
          <div key={c.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--rule-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)', minWidth: 40 }}>#{c.position}</span>
              <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>{c.name || `Category ${c.id}`}</span>
              <span className="meta">
                score <strong style={{ color: 'var(--ink)' }}>{c.score}</strong>
                {delta != null && (
                  <span style={{ marginLeft: 6, color: deltaColor }}>
                    {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} {Math.abs(delta)}
                  </span>
                )}
                {' · '}{c.publications} pubs · {topPages.length} pág · {topEntities.length} ent
              </span>
            </div>
            {topEntities.length > 0 && (
              <div style={{ marginLeft: 40, marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {topEntities.map(e => (
                  <span key={e.name}
                        title={`score ${e.score} · pos #${e.position} · ${e.publications} pubs${e.topic ? ' · topic: ' + e.topic : ''}`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontFamily: 'var(--mono)', fontSize: 10,
                          padding: '2px 6px',
                          background: e.topic ? 'var(--warn)' : 'var(--paper-3)',
                          color: e.topic ? 'var(--paper)' : 'var(--ink-2)',
                          border: '1px solid var(--rule-2)',
                        }}>
                    {e.name}
                    <span style={{ color: e.topic ? 'var(--paper)' : 'var(--ink-4)', fontSize: 9 }}>
                      s{e.score}
                    </span>
                  </span>
                ))}
              </div>
            )}
            {topPages.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginLeft: 40 }}>
                {topPages.map((p, i) => {
                  const ts = p.firstSeen || p.lastUpdated;
                  let ago = '';
                  if (ts) {
                    const diffH = Math.max(0, (Date.now() - new Date(ts).getTime()) / 3600_000);
                    ago = diffH < 1 ? `${Math.round(diffH * 60)}m` : diffH < 24 ? `${Math.round(diffH)}h` : `${Math.round(diffH / 24)}d`;
                  }
                  return (
                    <a key={p.url} href={p.url} target="_blank" rel="noreferrer"
                       title={p.title}
                       style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                      <div style={{ position: 'relative' }}>
                        {p.image ? (
                          <img src={p.image} alt={p.title}
                               style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', border: '1px solid var(--rule)', display: 'block' }} />
                        ) : (
                          <div style={{ width: '100%', aspectRatio: '16/9', border: '1px dashed var(--rule-2)', display: 'grid', placeItems: 'center', color: 'var(--ink-4)', fontSize: 10, fontFamily: 'var(--mono)' }}>
                            sin imagen
                          </div>
                        )}
                        <span style={{ position: 'absolute', top: 4, left: 4, padding: '2px 6px', background: 'var(--ink)', color: 'var(--paper)', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.05em' }}>
                          #{i + 1} · s{p.score}
                        </span>
                        {ago && (
                          <span title={`Primera vista en Discover hace ${ago}`}
                                style={{ position: 'absolute', top: 4, right: 4, padding: '2px 6px', background: 'var(--accent)', color: 'var(--paper)', fontFamily: 'var(--mono)', fontSize: 10 }}>
                            {ago}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontWeight: 500 }}>
                        {p.title}
                      </div>
                      {p.domain && (
                        <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--mono)', textTransform: 'lowercase' }}>
                          {p.domain.replace(/^www\./, '')}
                        </div>
                      )}
                    </a>
                  );
                })}
              </div>
            ) : (
              <div style={{ marginLeft: 40, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
                Sin páginas con esta categoría en el último poll.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SpikePanel({ spikes }) {
  const maxAbs = Math.max(...(spikes || []).map(s => Math.abs(s.delta)), 1);
  return (
    <div className="panel">
      <div className="kicker">
        Categorías Discover
        <Help>
          Estas son las <strong>categorías de Google Discover</strong> (Sports, Politics,
          Entertainment…), la taxonomía que usa Google para clasificar cada página. No confundir
          con nuestros <strong>topics</strong> internos (sucesos, legal…) que son un clasificador
          editorial paralelo.<br/><br/>
          El delta es la variación de score frente a la baseline rolling de 24h. Positivo = la
          categoría está subiendo; negativo = bajando.
        </Help>
        <span className="bar"></span>
        <span className="meta">delta 24h</span>
      </div>
      {spikes.map((s, i) => (
        <div key={i} className="spike-row">
          <span className="cat">{s.cat}</span>
          <div className="bar">
            <div className={`fill ${s.delta < 0 ? 'neg' : ''}`} style={{ width: `${(Math.abs(s.delta) / maxAbs) * 100}%` }}></div>
          </div>
          <span className="delta-lg" style={{ color: s.delta > 0 ? 'var(--accent)' : 'var(--ink-4)' }}>
            {s.delta > 0 ? '+' : ''}{s.delta}%
          </span>
        </div>
      ))}
    </div>
  );
}

function ConcordancePanel({ concordances }) {
  return (
    <div className="panel">
      <div className="kicker">
        Concordancias cross-source
        <Help>
          Entidades que aparecen simultáneamente en varias fuentes. Cuantas más fuentes
          coinciden, más sólida es la señal de tema del momento.<br/><br/>
          <strong>D</strong> = Discover (DiscoverSnoop ES)<br/>
          <strong>T</strong> = Google Trends<br/>
          <strong>X</strong> = X/Twitter trends<br/>
          <strong>M</strong> = número de artículos RSS de medios que la mencionan
        </Help>
        <span className="bar"></span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--mono)', fontSize: 11 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--rule)', color: 'var(--ink-4)', fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            <th style={{ textAlign: 'left', padding: '6px 4px', fontWeight: 600 }}>Entidad</th>
            <th style={{ width: 24 }}>D</th><th style={{ width: 24 }}>T</th><th style={{ width: 24 }}>X</th><th style={{ width: 36 }}>M</th>
            <th style={{ width: 36, textAlign: 'right' }}>Score</th>
          </tr>
        </thead>
        <tbody>
          {concordances.map((c, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--rule-2)' }}>
              <td style={{ padding: '8px 4px', fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 13 }}>{c.entity}</td>
              <td style={{ textAlign: 'center' }}>{c.discover ? <span style={{ color: 'var(--accent)' }}>●</span> : <span style={{ color: 'var(--rule)' }}>○</span>}</td>
              <td style={{ textAlign: 'center' }}>{c.trends ? <span style={{ color: 'var(--accent)' }}>●</span> : <span style={{ color: 'var(--rule)' }}>○</span>}</td>
              <td style={{ textAlign: 'center' }}>{c.twitter ? <span style={{ color: 'var(--accent)' }}>●</span> : <span style={{ color: 'var(--rule)' }}>○</span>}</td>
              <td style={{ textAlign: 'center', color: 'var(--ink-3)' }}>{c.media || '—'}</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{c.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FormulasPanel({ formulas }) {
  return (
    <div className="panel">
      <div className="kicker">
        Fórmulas del mes
        <Help>
          Plantillas de titular sugeridas en cada alerta Slack durante los últimos 30 días.
          Cada regla se identifica por su <code>matchKey</code> (ej. <code>entity/flash+legal</code>)
          y se muestra con cuántas veces se usó, a qué audiencia media acompañó (score DS de la
          entidad al dispararse) y las entidades que más la dispararon.<br/><br/>
          <strong>winner</strong> = avg score ≥15 (entidades de mucha audiencia),
          <strong> standard</strong> = ≥8, <strong>faltan_datos</strong> = pocas muestras.
        </Help>
        <span className="bar"></span>
        <span className="meta">proxy rendimiento</span>
      </div>
      {formulas.slice(0, 5).map(f => (
        <div key={f.id} className="formula-row">
          <div className="formula-pattern">"{f.pattern}"</div>
          <div className="formula-meta">
            <span>{f.vertical}</span>
            <span>·</span>
            <span>{f.uses} usos</span>
            <span>·</span>
            <span className={`tier-${f.tier}`}>{f.tier}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--ink)' }}>~{(f.avgReach/1000).toFixed(0)}k lectores</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function PatternsPanel({ patterns }) {
  return (
    <div className="panel">
      <div className="kicker">
        Patrones de titular
        <Help>
          N-gramas (secuencias de palabras) que aparecen repetidamente en titulares de Discover.
          Señal de que varios medios están usando la misma fórmula — útil para detectar
          saturación editorial y pivotar con un ángulo distinto.
        </Help>
        <span className="bar"></span>
        <span className="meta">poll actual</span>
      </div>
      {patterns.map((p, i) => (
        <div key={i} className="pattern-row">
          <span style={{ fontFamily: 'var(--serif)' }}>{p.pattern}</span>
          <div className="mini-bar"><div className="fill" style={{ width: `${(p.share / 25) * 100}%` }}></div></div>
          <span className="mono xs" style={{ textAlign: 'right', color: p.delta.startsWith('+') ? 'var(--ok)' : p.delta.startsWith('-') ? 'var(--accent)' : 'var(--ink-4)' }}>
            {p.share}%
          </span>
        </div>
      ))}
    </div>
  );
}

function WeeklyPanel({ weekly }) {
  return (
    <div className="panel">
      <div className="kicker">
        Histórico semanal por medio
        <Help>
          Número de artículos publicados por cada medio en cada una de las últimas 7 semanas.
          Útil para ver estacionalidad (¿hay semanas más activas?), contraste (¿un medio nos
          supera en volumen?) y detección de silencios inesperados.
        </Help>
        <span className="bar"></span>
        <span className="meta">últimas 7 semanas</span>
      </div>
      <div className="weekly-chart">
        {weekly.map((w, i) => {
          const max = Math.max(...w.w);
          const total = w.w[w.w.length - 1];
          return (
            <div key={i} className="weekly-row">
              <span className="label">{w.medium}</span>
              <div className="spark">
                {w.w.map((v, j) => <div key={j} className="bar" style={{ height: `${(v / max) * 100}%` }}></div>)}
              </div>
              <span className="total">{total}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrendsPanel({ trends }) {
  const items = trends || [];
  const max = items.length > 0 ? Math.max(...items.map(t => t.traffic || 0), 1) : 1;
  return (
    <div className="panel">
      <div className="kicker">
        Google Trends ES
        <Help>
          Topics que más está buscando la gente en Google dentro de España en este momento.
          El número (aprox. búsquedas) es el <code>approxTraffic</code> que publica Google
          Trends — es una estimación con granularidad gruesa (200 / 500 / 1.000 / 10.000+ …).
          <br/><br/>
          Un trend sin match en Discover es un <strong>Hueco SEO</strong>: hay demanda pero
          nadie está cubriéndolo.
        </Help>
        <span className="bar"></span>
        <span className="meta">{items.length} topics · aprox. búsquedas</span>
      </div>
      {items.length === 0 && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)', padding: 8 }}>
          Sin datos de Trends en este momento.
        </div>
      )}
      {items.map((t, i) => (
        <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--rule-2)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 3, lineHeight: 1.2 }}>
              {t.title}
            </div>
            {(t.news && t.news.length > 0) && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', lineHeight: 1.4 }}>
                {t.news.slice(0, 1).map((n, j) => (
                  <a key={j} href={n.url} target="_blank" rel="noreferrer" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>
                    ▸ {n.source ? n.source + ' · ' : ''}{(n.title || '').slice(0, 70)}{n.title && n.title.length > 70 ? '…' : ''}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div className="mini-bar" style={{ width: 50 }}>
              <div className="fill" style={{ width: `${((t.traffic || 0) / max) * 100}%`, background: 'var(--accent)' }}></div>
            </div>
            <span className="mono xs" style={{ color: 'var(--ink)', fontWeight: 700, minWidth: 48, textAlign: 'right' }}>
              {(t.traffic || 0).toLocaleString()}+
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function XTrendsPanel({ xTrends }) {
  const items = xTrends || [];
  return (
    <div className="panel">
      <div className="kicker">
        X / Twitter ES
        <Help>
          Top 50 trends de X/Twitter en España, extraídos de getdaytrends.com
          cada 30 minutos.<br/><br/>
          Solo disponemos del <strong>rank</strong> (1–50), no del volumen de
          tweets detrás. Un rank bajo (1, 2, 3…) = tema dominante. Un topic que
          cruza con Discover o Google Trends es la señal más fuerte (triple
          match).
        </Help>
        <span className="bar"></span>
        <span className="meta">{items.length} topics · ranking en vivo</span>
      </div>
      {items.length === 0 && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-sm)', color: 'var(--ink-4)', padding: 'var(--space-4)' }}>
          Sin datos de X/Twitter en este momento.
        </div>
      )}
      {items.map((t, i) => (
        <a key={i} href={t.url} target="_blank" rel="noreferrer"
           style={{
             display: 'flex',
             alignItems: 'center',
             gap: 'var(--space-5)',
             padding: 'var(--space-4) 0',
             borderBottom: '1px solid var(--rule-2)',
             textDecoration: 'none',
             color: 'inherit',
           }}>
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize: 'var(--text-sm)',
            fontWeight: 700,
            color: t.rank <= 3 ? 'var(--accent)' : t.rank <= 10 ? 'var(--ink-2)' : 'var(--ink-4)',
            minWidth: 26,
            textAlign: 'right',
          }}>
            {String(t.rank).padStart(2, '0')}
          </span>
          <span style={{
            flex: 1,
            fontFamily: t.topic.startsWith('#') ? 'var(--mono)' : 'var(--sans)',
            fontSize: 'var(--text-base)',
            fontWeight: t.rank <= 10 ? 600 : 400,
            color: 'var(--ink)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {t.topic}
          </span>
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize: 'var(--text-2xs)',
            color: 'var(--ink-4)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>↗ X</span>
        </a>
      ))}
    </div>
  );
}

Object.assign(window, { GapsPanel, EntitiesPanel, TopMediaPanel, SpikePanel, ConcordancePanel, FormulasPanel, PatternsPanel, WeeklyPanel, TrendsPanel, XTrendsPanel, CategoriesPanel });
