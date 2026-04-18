import Link from 'next/link';
import { siteConfig } from '@/lib/site-config';

export function Header() {
  return (
    <header className="border-b border-neutral-200 bg-paper">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-5">
        <Link
          href="/"
          className="font-serif text-2xl font-bold tracking-tight text-ink no-underline"
        >
          {siteConfig.name}
        </Link>
        <nav className="flex gap-5 text-sm font-medium text-neutral-700">
          <Link href="/" className="no-underline hover:text-accent">
            Portada
          </Link>
          <Link href="/boe" className="no-underline hover:text-accent">
            BOE diario
          </Link>
          <Link href="/sobre" className="no-underline hover:text-accent">
            Quiénes somos
          </Link>
        </nav>
      </div>
    </header>
  );
}
