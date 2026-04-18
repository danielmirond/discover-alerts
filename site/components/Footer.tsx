import Link from 'next/link';
import { siteConfig } from '@/lib/site-config';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-4xl px-4 py-10 text-sm text-neutral-600">
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
