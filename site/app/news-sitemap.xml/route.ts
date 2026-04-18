// Google News sitemap. Solo articulos publicados en las ultimas 48h
// (ese es el window que Google News indexa). Critico para Discover/News.

import { siteConfig } from '@/lib/site-config';
import { loadAllArticles } from '@/lib/content';

export const revalidate = 600; // 10 min

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
  const cutoff = Date.now() - 48 * 3600 * 1000;
  const recent = articles.filter(a => {
    const t = new Date(a.frontmatter.date).getTime();
    return t >= cutoff;
  });

  const items = recent
    .map(a => {
      const fm = a.frontmatter;
      const path =
        fm.type === 'boe-brief' && fm.boeDate
          ? `/boe/${fm.boeDate}`
          : `/articulo/${fm.slug}`;
      return `
  <url>
    <loc>${siteConfig.url}${path}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(siteConfig.publisher.name)}</news:name>
        <news:language>${siteConfig.language}</news:language>
      </news:publication>
      <news:publication_date>${fm.date}</news:publication_date>
      <news:title>${escapeXml(fm.title)}</news:title>
      <news:keywords>${escapeXml(fm.tags.join(', '))}</news:keywords>
    </news:news>
  </url>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${items}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=600',
    },
  });
}
