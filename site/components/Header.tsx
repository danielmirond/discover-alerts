import Link from 'next/link';
import { siteConfig } from '@/lib/site-config';

export function Header() {
  return (
    <header className="border-b border-neutral-200 bg-paper">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-5">
        <Link
          href="/"
          className="flex items-center gap-3 no-underline"
          aria-label={siteConfig.name}
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 60 60"
            aria-hidden="true"
            className="shrink-0"
          >
            <g stroke="currentColor" fill="none" strokeWidth="2.4">
              <circle cx="30" cy="30" r="26" />
              <circle cx="30" cy="30" r="18" />
              <circle cx="30" cy="30" r="10" />
            </g>
            <circle cx="42" cy="18" r="4.5" fill="#b91c1c" />
          </svg>
          <span className="font-serif text-xl font-bold tracking-tight text-ink md:text-2xl">
            RADAR <span className="text-accent">BOE</span>
          </span>
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
