import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadBoeBriefByDate, loadArticlesByType } from '@/lib/content';
import { siteConfig } from '@/lib/site-config';
import { ArticleJsonLd } from '@/components/ArticleJsonLd';

export const revalidate = 300;

type Props = { params: Promise<{ fecha: string }> };

export async function generateStaticParams() {
  const briefs = await loadArticlesByType('boe-brief');
  return briefs
    .filter(b => b.frontmatter.boeDate)
    .map(b => ({ fecha: b.frontmatter.boeDate! }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { fecha } = await params;
  const article = await loadBoeBriefByDate(fecha);
  if (!article) return { title: 'No encontrado' };
  const fm = article.frontmatter;
  return {
    title: fm.title,
    description: fm.description,
    alternates: { canonical: `/boe/${fecha}` },
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

export default async function BoeBriefPage({ params }: Props) {
  const { fecha } = await params;
  const article = await loadBoeBriefByDate(fecha);
  if (!article) notFound();
  const fm = article.frontmatter;

  const dateLabel = new Date(fm.date).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <article>
      <ArticleJsonLd article={article} url={`${siteConfig.url}/boe/${fecha}`} />
      <header className="mb-8 border-b-4 border-ink pb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
          Resumen BOE — {dateLabel}
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
          <h2 className="mb-3 font-serif text-lg font-semibold">
            Fuentes oficiales del BOE
          </h2>
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
                  ({s.departamento} — {s.identificador})
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
