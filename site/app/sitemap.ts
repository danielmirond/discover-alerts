import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site-config';
import { loadAllArticles } from '@/lib/content';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await loadAllArticles();
  const base = siteConfig.url;

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/boe`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/sobre`, changeFrequency: 'monthly', priority: 0.3 },
  ];

  const articleUrls: MetadataRoute.Sitemap = articles.map(a => {
    const fm = a.frontmatter;
    const path =
      fm.type === 'boe-brief' && fm.boeDate
        ? `/boe/${fm.boeDate}`
        : `/articulo/${fm.slug}`;
    return {
      url: `${base}${path}`,
      lastModified: new Date(fm.updated ?? fm.date),
      changeFrequency: 'weekly',
      priority: fm.type === 'boe-brief' ? 0.9 : 0.7,
    };
  });

  return [...staticUrls, ...articleUrls];
}
