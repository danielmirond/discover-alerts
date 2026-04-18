import { loadArticlesByType } from '@/lib/content';
import { ArticleCard } from '@/components/ArticleCard';

export const revalidate = 300;

export const metadata = {
  title: 'Resúmenes diarios del BOE',
  description:
    'Archivo cronológico de nuestros resúmenes diarios del Boletín Oficial del Estado.',
};

export default async function BoeIndexPage() {
  const briefs = await loadArticlesByType('boe-brief');

  return (
    <>
      <header className="mb-8 border-b-4 border-ink pb-6">
        <h1 className="font-serif text-4xl font-bold tracking-tight text-ink">
          Resúmenes diarios del BOE
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-neutral-700">
          Qué publica el Boletín Oficial del Estado cada día, explicado para
          que sepas qué te afecta.
        </p>
      </header>

      {briefs.length === 0 ? (
        <p className="text-neutral-600">
          Todavía no hay resúmenes publicados.
        </p>
      ) : (
        <div>
          {briefs.map(a => (
            <ArticleCard key={a.frontmatter.slug} article={a} />
          ))}
        </div>
      )}
    </>
  );
}
