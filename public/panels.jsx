// Side panels

function GapsPanel({ gaps }) {
  const kindClass = { 'HUECO SEO': 'seo', 'NO CUBRIMOS': 'miss', 'TRIPLE MATCH': 'triple', 'USA→ES': 'us' };
  return (
    <div className="panel">
      <div className="kicker">
        Huecos activos AHORA
        <span className="bar"></span>
        <span className="meta live" style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulse 1.4s infinite' }}></span>
          6 activos
        </span>
      </div>
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
        Entidades en vivo <span className="bar"></span> <span className="meta">momentum · últimas 60 min</span>
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
  const max = Math.max(...media.map(m => m.pubs));
  return (
    <div className="panel">
      <div className="kicker">Top 10 medios <span className="bar"></span> <span className="meta">últimas 12h</span></div>
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
  const maxAbs = Math.max(...spikes.map(s => Math.abs(s.delta)));
  return (
    <div className="panel">
      <div className="kicker">Categorías spike <span className="bar"></span> <span className="meta">vs. 24h baseline</span></div>
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
      <div className="kicker">Concordancias cross-source <span className="bar"></span></div>
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
      <div className="kicker">Fórmulas del mes <span className="bar"></span> <span className="meta">proxy rendimiento</span></div>
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
      <div className="kicker">Patrones de titular <span className="bar"></span> <span className="meta">poll actual</span></div>
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
      <div className="kicker">Histórico semanal por medio <span className="bar"></span> <span className="meta">últimas 7 semanas</span></div>
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

Object.assign(window, { GapsPanel, EntitiesPanel, TopMediaPanel, SpikePanel, ConcordancePanel, FormulasPanel, PatternsPanel, WeeklyPanel });
