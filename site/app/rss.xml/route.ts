import { siteConfig } from '@/lib/site-config';
import { loadAllArticles } from '@/lib/content';

export const revalidate = 600;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const articles = await loadAllArticles();
  const items = articles
    .slice(0, 50)
    .map(a => {
      const fm = a.frontmatter;
      const path =
        fm.type === 'boe-brief' && fm.boeDate
          ? `/boe/${fm.boeDate}`
          : `/articulo/${fm.slug}`;
      const url = `${siteConfig.url}${path}`;
      return `
    <item>
      <title>${escapeXml(fm.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(fm.date).toUTCString()}</pubDate>
      <description>${escapeXml(fm.description)}</description>
      <category>${escapeXml(fm.type === 'boe-brief' ? 'Resumen BOE' : 'Noticias')}</category>
    </item>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteConfig.name)}</title>
    <link>${siteConfig.url}</link>
    <atom:link href="${siteConfig.url}/rss.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXml(siteConfig.description)}</description>
    <language>${siteConfig.language}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=600',
    },
  });
}
