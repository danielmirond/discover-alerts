import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { siteConfig } from '@/lib/site-config';
import { loadAllArticles } from '@/lib/content';
import { ArticleCard } from '@/components/ArticleCard';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return siteConfig.authors.map(a => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const author = siteConfig.authors.find(a => a.slug === slug);
  if (!author) return { title: 'Autor no encontrado' };
  return {
    title: author.name,
    description: author.bio,
    alternates: { canonical: `/autor/${slug}` },
    openGraph: {
      type: 'profile',
      title: author.name,
      description: author.bio,
    },
  };
}

export default async function AuthorPage({ params }: Props) {
  const { slug } = await params;
  const author = siteConfig.authors.find(a => a.slug === slug);
  if (!author) notFound();

  const all = await loadAllArticles();
  const authored = all.filter(a => a.frontmatter.author === slug);

  // JSON-LD Person para E-E-A-T
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author.name,
    jobTitle: author.role,
    email: author.email,
    url: `${siteConfig.url}/autor/${slug}`,
    worksFor: {
      '@type': 'NewsMediaOrganization',
      name: siteConfig.publisher.name,
      url: siteConfig.url,
    },
    description: author.bio,
    knowsAbout: author.specialties,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="mb-8 border-b-4 border-ink pb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
          {author.role}
        </p>
        <h1 className="font-serif text-4xl font-bold tracking-tight text-ink">
          {author.name}
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-neutral-700">
          {author.bio}
        </p>
      </header>

      <section className="prose prose-neutral max-w-none prose-headings:font-serif prose-a:text-accent">
        <h2>Sobre la redacción</h2>
        <p>{author.longBio}</p>

        <h2>Áreas de especialización</h2>
        <ul>
          {author.specialties.map(s => (
            <li key={s}>{s}</li>
          ))}
        </ul>

        <h2>Metodología editorial</h2>
        <ol>
          {author.methodology.map(m => (
            <li key={m}>{m}</li>
          ))}
        </ol>

        <h2>Contacto</h2>
        <p>
          Para correcciones, sugerencias o cualquier consulta editorial:{' '}
          <a href={`mailto:${author.email}`}>{author.email}</a>
        </p>
      </section>

      {authored.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 font-serif text-xl font-semibold uppercase tracking-wide text-neutral-600">
            Últimas publicaciones
          </h2>
          {authored.slice(0, 10).map(a => (
            <ArticleCard key={a.frontmatter.slug} article={a} />
          ))}
        </section>
      )}
    </>
  );
}
