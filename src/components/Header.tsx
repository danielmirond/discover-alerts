"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header() {
  const t = useTranslations("nav");
  const locale = useLocale();

  const links = [
    { href: `/${locale}`, label: t("home") },
    { href: `/${locale}/wearables`, label: t("wearables") },
    { href: `/${locale}/suplementos`, label: t("supplements") },
    { href: `/${locale}/protocolos`, label: t("protocols") },
  ];

  return (
    <header className="sticky top-0 bg-bg/95 backdrop-blur-xl border-b border-border z-50">
      <div className="max-w-[1000px] mx-auto px-6 flex items-center justify-between h-14">
        {/* Logo */}
        <Link
          href={`/${locale}`}
          className="font-serif text-lg font-extralight text-white tracking-tight hover:text-accent-blue transition-colors"
        >
          BiohackLab
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase text-muted hover:text-text transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Language Switcher */}
        <LanguageSwitcher />
      </div>
    </header>
  );
}
