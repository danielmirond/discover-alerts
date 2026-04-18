import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadAllArticles } from '@/lib/content';
import { ArticleCard } from '@/components/ArticleCard';

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

function slugifyTag(tag: string): string {
  return tag
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function generateStaticParams() {
  const all = await loadAllArticles();
  const tags = new Set<string>();
  for (const a of all) {
    for (const t of a.frontmatter.tags ?? []) tags.add(slugifyTag(t));
  }
  return Array.from(tags).map(slug => ({ slug }));
}

async function resolveTag(slug: string): Promise<{ original: string; articles: Awaited<ReturnType<typeof loadAllArticles>> } | null> {
  const all = await loadAllArticles();
  let original: string | null = null;
  const articles = all.filter(a => {
    for (const t of a.frontmatter.tags ?? []) {
      if (slugifyTag(t) === slug) {
        if (!original) original = t;
        return true;
      }
    }
    return false;
  });
  if (!original || articles.length === 0) return null;
  return { original, articles };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await resolveTag(slug);
  if (!data) return { title: 'Tema no encontrado' };
  return {
    title: `Tema: ${data.original}`,
    description: `Todas las publicaciones de Radar BOE sobre ${data.original}.`,
    alternates: { canonical: `/tag/${slug}` },
  };
}

export default async function TagPage({ params }: Props) {
  const { slug } = await params;
  const data = await resolveTag(slug);
  if (!data) notFound();

  return (
    <>
      <header className="mb-8 border-b-4 border-ink pb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
          Tema
        </p>
        <h1 className="font-serif text-4xl font-bold tracking-tight text-ink">
          {data.original}
        </h1>
        <p className="mt-3 text-lg text-neutral-700">
          {data.articles.length} publicación{data.articles.length === 1 ? '' : 'es'}.
        </p>
      </header>

      <div>
        {data.articles.map(a => (
          <ArticleCard key={a.frontmatter.slug} article={a} />
        ))}
      </div>
    </>
  );
}
