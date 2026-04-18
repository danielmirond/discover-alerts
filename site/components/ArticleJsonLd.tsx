import { siteConfig } from '@/lib/site-config';
import type { Article } from '@/lib/types';

// JSON-LD schema.org NewsArticle. Critico para Google News y Discover:
// Google usa author/publisher/datePublished para validar autoridad
// y datemodified para freshness. Sin esto, no aparecemos en News.

export function ArticleJsonLd({
  article,
  url,
}: {
  article: Article;
  url: string;
}) {
  const fm = article.frontmatter;
  const author =
    siteConfig.authors.find(a => a.slug === fm.author) ?? siteConfig.authors[0];

  const data = {
    '@context': 'https://schema.org',
    '@type': fm.type === 'boe-brief' ? 'NewsArticle' : 'NewsArticle',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: fm.title,
    description: fm.description,
    datePublished: fm.date,
    dateModified: fm.updated ?? fm.date,
    inLanguage: siteConfig.locale,
    image: fm.heroImage ? [fm.heroImage] : [siteConfig.defaultOgImage],
    author: {
      '@type': 'Organization',
      name: author.name,
      url: `${siteConfig.url}/sobre`,
    },
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: siteConfig.publisher.name,
      logo: {
        '@type': 'ImageObject',
        url: `${siteConfig.url}${siteConfig.publisher.logo}`,
      },
    },
    isAccessibleForFree: true,
    keywords: fm.tags.join(', '),
    articleSection:
      fm.type === 'boe-brief' ? 'Resumen BOE' : 'Noticias',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
