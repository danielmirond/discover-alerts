import { ImageResponse } from 'next/og';
import { loadBoeBriefByDate } from '@/lib/content';

export const runtime = 'nodejs';
export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };

export default async function BoeOpengraphImage({
  params,
}: {
  params: { fecha: string };
}) {
  const article = await loadBoeBriefByDate(params.fecha);
  const fm = article?.frontmatter;
  const title = fm?.title ?? 'Resumen BOE';
  const dateLabel = fm
    ? new Date(fm.date).toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0a0a0a',
          color: '#fafafa',
          display: 'flex',
          flexDirection: 'column',
          padding: '72px',
          fontFamily: 'Georgia, serif',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <svg width="44" height="44" viewBox="0 0 60 60">
            <g stroke="#fafafa" fill="none" strokeWidth="3">
              <circle cx="30" cy="30" r="26" />
              <circle cx="30" cy="30" r="18" />
              <circle cx="30" cy="30" r="10" />
            </g>
            <circle cx="42" cy="18" r="5.5" fill="#b91c1c" />
          </svg>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              display: 'flex',
              gap: '8px',
            }}
          >
            <span>RADAR</span>
            <span style={{ color: '#b91c1c' }}>BOE</span>
          </div>
          <div style={{ flex: 1 }} />
          <div
            style={{
              background: '#b91c1c',
              color: '#fafafa',
              padding: '10px 22px',
              fontSize: 18,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            Resumen BOE
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              fontSize: 20,
              fontFamily: 'system-ui, sans-serif',
              color: '#a3a3a3',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
            }}
          >
            {dateLabel}
          </div>
          <div
            style={{
              fontSize: title.length > 80 ? 52 : 62,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              display: 'flex',
              maxWidth: '1050px',
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            fontSize: 20,
            fontFamily: 'system-ui, sans-serif',
            color: '#737373',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
          }}
        >
          radarboe.es
        </div>
      </div>
    ),
    size,
  );
}
