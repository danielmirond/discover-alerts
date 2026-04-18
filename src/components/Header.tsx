"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header() {
  const t = useTranslations("nav");
  const locale = useLocale();

  const aboutLabel =
    locale === "es" ? "Sobre"
    : locale === "fr" ? "À propos"
    : locale === "de" ? "Über"
    : "About";

  const links = [
    { href: `/${locale}/wearables`, label: t("wearables") },
    { href: `/${locale}/suplementos`, label: t("supplements") },
    { href: `/${locale}/protocolos`, label: t("protocols") },
    { href: `/${locale}/about`, label: aboutLabel },
  ];

  return (
    <header className="sticky top-0 bg-bg/90 backdrop-blur-md border-b border-hairline z-50">
      <div className="max-w-[1200px] mx-auto px-8 flex items-center justify-between h-[72px]">
        <Link
          href={`/${locale}`}
          className="group flex items-baseline gap-3"
        >
          <span className="font-serif text-[24px] font-light text-charcoal tracking-[0.08em] uppercase group-hover:text-emerald transition-colors">
            Aevum
          </span>
          <span className="hidden sm:inline w-px h-4 bg-line" />
          <span className="text-[9px] tracking-[0.3em] uppercase text-stone hidden sm:inline">
            Precision longevity
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-[11px] tracking-[0.1em] uppercase text-stone hover:text-emerald transition-colors font-medium"
            >
              {label}
            </Link>
          ))}
        </nav>

        <LanguageSwitcher />
      </div>
    </header>
  );
}
