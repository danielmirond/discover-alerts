import { ImageResponse } from 'next/og';
import { siteConfig } from '@/lib/site-config';

export const runtime = 'edge';
export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };
export const alt = siteConfig.name;

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#fafafa',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          fontFamily: 'Georgia, serif',
          color: '#0a0a0a',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <svg width="80" height="80" viewBox="0 0 60 60">
            <g stroke="#0a0a0a" fill="none" strokeWidth="3">
              <circle cx="30" cy="30" r="26" />
              <circle cx="30" cy="30" r="18" />
              <circle cx="30" cy="30" r="10" />
              <line x1="30" y1="30" x2="52" y2="8" strokeWidth="3.2" />
            </g>
            <circle cx="42" cy="18" r="5.5" fill="#b91c1c" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1 }}>
              RADAR
            </div>
            <div style={{ fontSize: 48, fontWeight: 700, color: '#b91c1c', lineHeight: 1 }}>
              BOE
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '920px' }}>
          <div
            style={{
              fontSize: 70,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            Lo que el BOE publica hoy
          </div>
          <div
            style={{
              fontSize: 70,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: '#b91c1c',
            }}
          >
            y por que te afecta.
          </div>
        </div>

        <div
          style={{
            fontSize: 22,
            fontFamily: 'system-ui, sans-serif',
            color: '#525252',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
          }}
        >
          radarboe.es — Medio digital especializado
        </div>
      </div>
    ),
    size,
  );
}
