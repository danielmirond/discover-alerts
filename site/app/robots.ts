import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site-config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      // Permitimos explicitamente Googlebot-News para entrar en Google News
      { userAgent: 'Googlebot-News', allow: '/' },
    ],
    sitemap: [
      `${siteConfig.url}/sitemap.xml`,
      `${siteConfig.url}/news-sitemap.xml`,
    ],
  };
}
