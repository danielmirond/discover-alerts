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
  const arrows = { rising: '▲', peaking: '●', fading: '▼', steady: '—' };
  const labels = { rising: 'rising', peaking: 'peaking', fading: 'fading', steady: 'steady' };
  return (
    <span className={`velocity ${velocity}`}>
      <span>{arrows[velocity]}</span> {labels[velocity]} <span style={{ opacity: 0.7, marginLeft: 2 }}>×{ratio.toFixed(1)}</span>
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
        <div className="alert-metrics">
          {alert.discoverScore != null && <span className="m">score <span className="score">{alert.discoverScore}</span></span>}
          {alert.feedPos != null && <span className="m">pos <strong>#{alert.feedPos}</strong></span>}
          <span className="m">pubs <strong>{alert.publications}</strong></span>
          <span className="m muted">entidad · <strong style={{ color: 'var(--ink)' }}>{alert.entity}</strong></span>
        </div>
      </div>
      <div className="alert-right">
        <SourceLine sources={alert.sources} />
        <ImageCheck image={alert.image} />
      </div>
    </div>
  );
}

Object.assign(window, { cx, Tag, VelocityBadge, SourceLine, ImageCheck, AlertRow });
