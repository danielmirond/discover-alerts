import Link from 'next/link';
import { loadAllArticles } from '@/lib/content';

export const revalidate = 300;

export const metadata = {
  title: 'Temas',
  description: 'Todos los temas que cubre Radar BOE.',
};

function slugifyTag(tag: string): string {
  return tag
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default async function TagIndexPage() {
  const all = await loadAllArticles();
  const tagCounts = new Map<string, number>();
  for (const a of all) {
    for (const t of a.frontmatter.tags ?? []) {
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
  }
  const tags = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <header className="mb-8 border-b-4 border-ink pb-6">
        <h1 className="font-serif text-4xl font-bold tracking-tight text-ink">
          Temas
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-neutral-700">
          Todos los temas que cubrimos, ordenados por frecuencia.
        </p>
      </header>

      {tags.length === 0 ? (
        <p className="text-neutral-600">Aún no hay temas catalogados.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map(([tag, count]) => (
            <Link
              key={tag}
              href={`/tag/${slugifyTag(tag)}`}
              className="rounded-sm border border-neutral-300 px-3 py-1.5 text-sm no-underline hover:border-accent hover:text-accent"
            >
              {tag}{' '}
              <span className="text-xs text-neutral-500">({count})</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
