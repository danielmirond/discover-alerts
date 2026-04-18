import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadArticleBySlug, loadArticlesByType } from '@/lib/content';
import { siteConfig } from '@/lib/site-config';
import { ArticleJsonLd } from '@/components/ArticleJsonLd';
import { ArticleHero } from '@/components/ArticleHero';

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const articles = await loadArticlesByType('noticia');
  return articles.map(a => ({ slug: a.frontmatter.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await loadArticleBySlug(slug);
  if (!article) return { title: 'No encontrado' };
  const fm = article.frontmatter;
  return {
    title: fm.title,
    description: fm.description,
    alternates: { canonical: `/articulo/${slug}` },
    openGraph: {
      type: 'article',
      title: fm.title,
      description: fm.description,
      publishedTime: fm.date,
      modifiedTime: fm.updated ?? fm.date,
      authors: [fm.author],
      images: fm.heroImage ? [{ url: fm.heroImage, alt: fm.heroAlt ?? '' }] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await loadArticleBySlug(slug);
  if (!article) notFound();
  const fm = article.frontmatter;

  const dateLabel = new Date(fm.date).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <article>
      <ArticleJsonLd
        article={article}
        url={`${siteConfig.url}/articulo/${slug}`}
      />
      <ArticleHero pain={fm.pain} title={fm.title} kicker={dateLabel} />
      <header className="mb-8 border-b-4 border-ink pb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
          {dateLabel} · {article.readingMinutes} min de lectura
        </p>
        <h1 className="font-serif text-3xl font-bold leading-tight tracking-tight text-ink md:text-4xl">
          {fm.title}
        </h1>
        <p className="mt-3 text-lg text-neutral-700">{fm.description}</p>
        {fm.painHook && (
          <p className="mt-4 rounded-sm border-l-4 border-accent bg-red-50 px-4 py-2 font-medium text-ink">
            {fm.painHook}
          </p>
        )}
      </header>

      <div
        className="prose prose-neutral max-w-none prose-headings:font-serif prose-a:text-accent"
        dangerouslySetInnerHTML={{ __html: article.html }}
      />

      {fm.sources.length > 0 && (
        <section className="mt-10 border-t border-neutral-200 pt-6">
          <h2 className="mb-3 font-serif text-lg font-semibold">Fuentes</h2>
          <ul className="space-y-2 text-sm">
            {fm.sources.map(s => (
              <li key={s.identificador}>
                <a
                  href={s.url}
                  className="text-accent"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {s.titulo}
                </a>
                <span className="ml-2 text-neutral-500">
                  ({s.departamento})
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-10 border-t border-neutral-200 pt-6 text-sm text-neutral-500">
        <p>{siteConfig.aiDisclosure}</p>
      </footer>
    </article>
  );
}
