// Atoms & helpers
const { useState, useEffect, useRef, useMemo } = React;

function cx(...parts) { return parts.filter(Boolean).join(' '); }

function Tag({ children, kind = 'default', small }) {
  const cls = kind === 'filled' ? 'tag filled'
    : kind === 'accent' ? 'tag accent'
    : kind === 'warn' ? 'tag warn'
    : kind === 'ok' ? 'tag ok'
    : kind === 'viral' ? 'tag viral'
    : kind === 'ghost' ? 'tag ghost' : 'tag';
  return <span className={cls} style={small ? { fontSize: 9, padding: '1px 5px' } : null}>{children}</span>;
}

function VelocityBadge({ velocity, ratio }) {
  const arrows = { rising: '▲', peaking: '●', fading: '▼', steady: '—', new: '✦' };
  const labels = { rising: 'rising', peaking: 'peaking', fading: 'fading', steady: 'steady', new: 'new' };
  const v = (velocity && arrows[velocity]) ? velocity : 'steady';
  const r = typeof ratio === 'number' && isFinite(ratio) ? Math.max(0, Math.min(10, ratio)) : 1;
  const tooltip = {
    rising: 'Acelerando: v1h / v3h ≥ 1.5',
    peaking: 'Pico sostenido: acelera y lleva ≥12h con actividad',
    fading: 'Bajando: v1h / v3h ≤ 0.5',
    steady: 'Estable',
    new: 'Burst nuevo: aparece en la última hora sin historial previo',
  }[v];
  return (
    <span className={`velocity ${v}`} title={tooltip}>
      <span>{arrows[v]}</span> {labels[v]} <span style={{ opacity: 0.7, marginLeft: 2 }}>×{r.toFixed(1)}</span>
    </span>
  );
}

function SourceLine({ sources }) {
  const items = [
    { k: 'D', on: sources.discover, label: 'Discover' },
    { k: 'T', on: sources.trends, label: 'Trends' },
    { k: 'X', on: sources.twitter, label: 'X' },
    { k: 'M', on: sources.media > 0, label: 'Media', count: sources.media },
    { k: 'mn', on: sources.meneame, label: 'Menéame' },
    { k: 'W', on: sources.wikipedia, label: 'Wikipedia' },
  ];
  return (
    <div className="sourceline" title="Presencia por fuente">
      {items.map((it, i) => (
        <span key={i} className={`src ${it.on ? 'on' : ''}`} title={it.label}>
          {it.k}{it.count != null && it.count > 0 ? <sup style={{ fontSize: 7 }}>{it.count}</sup> : null}
        </span>
      ))}
    </div>
  );
}

function ImageCheck({ image }) {
  if (!image) return <div className="image-check"><span>▯</span> sin imagen</div>;
  const ok = image.ok;
  return (
    <div className={`image-check ${ok ? 'ok' : 'bad'}`} title={image.reason || ''}>
      <span>{ok ? '✓' : '✗'}</span> {image.w}×{image.h} · {image.ratio}
    </div>
  );
}

// --- Alert row
function AlertRow({ alert, onOpen, fresh }) {
  const typeStyle = {
    'triple_match': 'viral',
    'discover_1h': 'filled',
    'trends_without_discover': 'accent',
    'wikipedia_surge': 'filled',
    'meneame_hot': 'warn',
    'entity_concordance': 'ghost',
    'us_relevant': 'filled',
    'headline_pattern': 'ghost',
  }[alert.type] || 'filled';
  return (
    <div className={`alert ${fresh ? 'fresh' : ''}`} onClick={() => onOpen(alert)}>
      <div className="alert-time">
        <span className="ts">{alert.ts}</span>
        <span className="ago">{alert.ago}</span>
      </div>
      <div className="alert-body">
        <div className="alert-tags">
          <Tag kind={typeStyle}>{alert.typeLabel}</Tag>
          {alert.category && alert.category !== '—' ? <Tag kind="ghost">{alert.category}</Tag> : null}
          <VelocityBadge velocity={alert.velocity} ratio={alert.velocityRatio} />
        </div>
        <h3 className="alert-headline">{alert.headline}</h3>
        <p className="alert-snippet">{alert.snippet}</p>
        {(alert.examples || []).length > 0 && (
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {alert.examples.slice(0, 5).map((ex, i) => (
              <a key={i} href={ex.url} target="_blank" rel="noreferrer"
                 onClick={(e) => e.stopPropagation()}
                 title={ex.title}
                 style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', textDecoration: 'none', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ color: 'var(--accent)' }}>▸</span>
                {ex.source ? <span style={{ color: 'var(--ink-2)', marginLeft: 4 }}>{ex.source}</span> : null}
                <span style={{ marginLeft: 6 }}>{ex.title}</span>
              </a>
            ))}
          </div>
        )}
        <div className="alert-metrics">
          {alert.discoverScore != null && <span className="m">score <span className="score">{alert.discoverScore}</span></span>}
          {alert.feedPos != null && <span className="m">pos <strong>#{alert.feedPos}</strong></span>}
          <span className="m">pubs <strong>{alert.publications}</strong></span>
          {(() => {
            const e = alert.entity;
            if (!e) return null;
            // Heurística: si es un título largo o una frase (>60 chars o con puntuación de frase),
            // NO es una entidad real → no pintar. Evita el bug de pintar titulares como "entidad".
            const isSentence = e.length > 60 || /[.!?]\s|["“]/.test(e);
            if (isSentence) return null;
            return <span className="m muted">entidad · <strong style={{ color: 'var(--ink)' }}>{e}</strong></span>;
          })()}
        </div>
      </div>
      <div className="alert-right">
        <SourceLine sources={alert.sources} />
        <ImageCheck image={alert.image} />
      </div>
    </div>
  );
}

/**
 * <Help> — icono "?" con tooltip al hover. Contenido en children.
 * Pensado para acompañar kickers de paneles y labels de filtros.
 */
function Help({ children }) {
  return (
    <span className="help-tip" tabIndex={0}>
      ?
      <span className="tip-body">{children}</span>
    </span>
  );
}

Object.assign(window, { cx, Tag, VelocityBadge, SourceLine, ImageCheck, AlertRow, Help });
