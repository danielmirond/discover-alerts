import { loadAllArticles, loadArticlesByType } from '@/lib/content';
import { ArticleCard } from '@/components/ArticleCard';
import { siteConfig } from '@/lib/site-config';

export const revalidate = 300; // ISR cada 5 min por si hay nuevo contenido

export default async function HomePage() {
  const [allArticles, briefs] = await Promise.all([
    loadAllArticles(),
    loadArticlesByType('boe-brief'),
  ]);

  const latestBrief = briefs[0];
  const noticias = allArticles.filter(a => a.frontmatter.type === 'noticia');

  return (
    <>
      <section className="mb-10 border-b-4 border-ink pb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
          {siteConfig.name}
        </p>
        <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-ink md:text-5xl">
          Lo que el BOE publica hoy y por qué te afecta
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-neutral-700">
          Resumen diario del Boletín Oficial del Estado y noticias con
          impacto ciudadano: nómina, festivos, vivienda, impuestos, ayudas.
        </p>
      </section>

      {latestBrief && (
        <section className="mb-10">
          <h2 className="mb-4 font-serif text-xl font-semibold uppercase tracking-wide text-neutral-600">
            Resumen BOE del día
          </h2>
          <ArticleCard article={latestBrief} />
        </section>
      )}

      <section>
        <h2 className="mb-4 font-serif text-xl font-semibold uppercase tracking-wide text-neutral-600">
          Últimas noticias
        </h2>
        {noticias.length === 0 ? (
          <p className="text-neutral-600">
            Todavía no hay noticias publicadas.
          </p>
        ) : (
          <div>
            {noticias.map(a => (
              <ArticleCard key={a.frontmatter.slug} article={a} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
