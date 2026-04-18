import Link from 'next/link';
import type { Article } from '@/lib/types';

export function ArticleCard({ article }: { article: Article }) {
  const { frontmatter: fm } = article;
  const href =
    fm.type === 'boe-brief' && fm.boeDate
      ? `/boe/${fm.boeDate}`
      : `/articulo/${fm.slug}`;

  const date = new Date(fm.date);
  const dateLabel = date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <article className="border-b border-neutral-200 py-6 last:border-0">
      <Link href={href} className="group block no-underline">
        <div className="mb-2 flex items-center gap-3 text-xs uppercase tracking-wide text-neutral-500">
          <span>{dateLabel}</span>
          <span>·</span>
          <span>{article.readingMinutes} min de lectura</span>
          {fm.type === 'boe-brief' && (
            <>
              <span>·</span>
              <span className="font-semibold text-accent">Resumen BOE</span>
            </>
          )}
        </div>
        <h2 className="mb-2 font-serif text-2xl font-bold leading-snug text-ink group-hover:text-accent">
          {fm.title}
        </h2>
        <p className="text-neutral-700">{fm.description}</p>
        {fm.painHook && (
          <p className="mt-2 text-sm font-medium text-accent">
            {fm.painHook}
          </p>
        )}
      </Link>
    </article>
  );
}
