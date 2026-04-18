import { ImageResponse } from 'next/og';
import { loadArticleBySlug } from '@/lib/content';
import { painColor } from '@/lib/site-config';

export const runtime = 'nodejs';
export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };

export default async function ArticleOpengraphImage({
  params,
}: {
  params: { slug: string };
}) {
  const article = await loadArticleBySlug(params.slug);
  const fm = article?.frontmatter;
  const title = fm?.title ?? 'Radar BOE';
  const painHook = fm?.painHook ?? '';
  const color = painColor(fm?.pain ?? 'otros');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#fafafa',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Georgia, serif',
          color: '#0a0a0a',
        }}
      >
        {/* Barra de color segun el dolor */}
        <div
          style={{
            width: '100%',
            height: 18,
            background: color.bg,
          }}
        />

        <div
          style={{
            flex: 1,
            padding: '60px 72px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <svg width="44" height="44" viewBox="0 0 60 60">
              <g stroke="#0a0a0a" fill="none" strokeWidth="3">
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
                background: color.bg,
                color: color.fg,
                padding: '8px 20px',
                borderRadius: 4,
                fontSize: 18,
                fontFamily: 'system-ui, sans-serif',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {color.label}
            </div>
          </div>

          <div
            style={{
              fontSize: title.length > 80 ? 52 : 62,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              display: 'flex',
            }}
          >
            {title}
          </div>

          {painHook ? (
            <div
              style={{
                fontSize: 26,
                fontFamily: 'system-ui, sans-serif',
                color: color.bg,
                fontWeight: 600,
                borderLeft: `6px solid ${color.bg}`,
                paddingLeft: 18,
                display: 'flex',
              }}
            >
              {painHook}
            </div>
          ) : (
            <div />
          )}
        </div>
      </div>
    ),
    size,
  );
}
