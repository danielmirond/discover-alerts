import Link from 'next/link';
import Image from 'next/image';
import { siteConfig } from '@/lib/site-config';

export function Header() {
  return (
    <header className="border-b border-ink/10 bg-paper">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-5">
        <Link
          href="/"
          className="flex items-center gap-3 no-underline"
          aria-label={siteConfig.name}
        >
          <Image
            src="/logo-mark.svg"
            alt=""
            width={44}
            height={44}
            priority
            className="h-10 w-10 md:h-11 md:w-11"
          />
          <span className="flex flex-col leading-none">
            <span className="font-serif text-xl font-bold tracking-wide text-ink md:text-2xl">
              RADAR BOE
            </span>
            <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-ink/70 md:text-xs">
              {siteConfig.tagline}
            </span>
          </span>
        </Link>
        <nav className="flex gap-5 text-sm font-medium text-ink/80">
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
