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
        <div key={i} className="ent-row">
          <div className="ent-name">
            {e.name}
            <span className="cat">{e.cat}</span>
          </div>
          <div className="momentum-bar">
            <div className="momentum-fill" style={{ width: `${e.momentum}%` }}></div>
          </div>
          <div className={`ent-delta ${e.trend}`}>
            {e.trend === 'up' ? '▲' : e.trend === 'down' ? '▼' : '—'} {e.delta}
          </div>
        </div>
      ))}
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
          Cabeceras RSS con más artículos publicados en las últimas 12h. Son
          <strong> medios</strong> (ABC, El País, Marca…), no entidades de Discover.
          El ranking solo refleja volumen de publicación, no calidad editorial.
        </Help>
        <span className="bar"></span>
        <span className="meta">últimas 12h</span>
      </div>
      {media.map((m, i) => (
        <div key={i} className="simple-row">
          <div className="left">
            <span className="rank">{String(i + 1).padStart(2, '0')}</span>
            <span className="label">{m.name}</span>
          </div>
          <div className="left" style={{ gap: 8 }}>
            <div className="mini-bar" style={{ width: 60 }}>
              <div className="fill" style={{ width: `${(m.pubs / max) * 100}%` }}></div>
            </div>
            <span className="meta"><strong style={{ color: 'var(--ink)' }}>{m.pubs}</strong> · {m.share}%</span>
          </div>
        </div>
      ))}
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

Object.assign(window, { GapsPanel, EntitiesPanel, TopMediaPanel, SpikePanel, ConcordancePanel, FormulasPanel, PatternsPanel, WeeklyPanel, TrendsPanel, XTrendsPanel });
