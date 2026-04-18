"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";

export function Header() {
  const t = useTranslations("nav");
  const locale = useLocale();

  const aboutLabel =
    locale === "es" ? "Sobre"
    : locale === "fr" ? "À propos"
    : locale === "de" ? "Über"
    : "About";

  const paths: Record<string, { supplements: string; protocols: string; beauty: string }> = {
    es: { supplements: "suplementos", protocols: "protocolos", beauty: "belleza" },
    en: { supplements: "supplements", protocols: "protocols", beauty: "beauty" },
    fr: { supplements: "supplements", protocols: "protocols", beauty: "beaute" },
    de: { supplements: "supplements", protocols: "protocols", beauty: "schoenheit" },
  };
  const p = paths[locale] || paths.en;

  const links = [
    { href: `/${locale}/wearables`, label: t("wearables") },
    { href: `/${locale}/${p.supplements}`, label: t("supplements") },
    { href: `/${locale}/${p.protocols}`, label: t("protocols") },
    { href: `/${locale}/${p.beauty}`, label: t("beauty") },
    { href: `/${locale}/about`, label: aboutLabel },
  ];

  return (
    <header className="sticky top-0 bg-bg/90 backdrop-blur-md border-b border-hairline z-50">
      <div className="max-w-[1200px] mx-auto px-8 flex items-center justify-between h-[72px]">
        <Link
          href={`/${locale}`}
          className="group flex items-center gap-3"
        >
          <Logo variant="wordmark" size={22} className="group-hover:opacity-80 transition-opacity" />
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
