import Link from 'next/link';
import { siteConfig } from '@/lib/site-config';
import { NewsletterForm } from './NewsletterForm';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-4xl px-4 py-10 text-sm text-neutral-600">
        <section className="mb-10 rounded-sm border border-neutral-200 bg-paper p-6">
          <h2 className="mb-2 font-serif text-lg font-semibold text-ink">
            El BOE que te afecta, cada mañana en tu email
          </h2>
          <p className="mb-4 max-w-xl text-sm text-neutral-600">
            Un resumen diario con lo que cambia en tu nómina, tu
            calendario y tus obligaciones. Sin spam, cancelas cuando
            quieras.
          </p>
          <div className="relative">
            <NewsletterForm />
          </div>
        </section>

        <div className="mb-4 font-serif text-lg font-semibold text-ink">
          {siteConfig.name}
        </div>
        <p className="mb-4 max-w-xl leading-relaxed">
          {siteConfig.description}
        </p>
        <p className="mb-6 max-w-xl text-xs leading-relaxed text-neutral-500">
          {siteConfig.aiDisclosure}
        </p>
        <div className="flex flex-wrap gap-4 text-xs">
          <Link href="/sobre" className="no-underline hover:text-accent">
            Quiénes somos
          </Link>
          <Link
            href={`/autor/${siteConfig.authors[0].slug}`}
            className="no-underline hover:text-accent"
          >
            Redacción
          </Link>
          <Link href="/tag" className="no-underline hover:text-accent">
            Temas
          </Link>
          <Link href="/rss.xml" className="no-underline hover:text-accent">
            RSS
          </Link>
          <Link href="/sitemap.xml" className="no-underline hover:text-accent">
            Sitemap
          </Link>
          <span className="text-neutral-400">
            © {new Date().getFullYear()} {siteConfig.name}
          </span>
        </div>
      </div>
    </footer>
  );
}
