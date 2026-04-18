"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header() {
  const t = useTranslations("nav");
  const locale = useLocale();

  const links = [
    { href: `/${locale}/wearables`, label: t("wearables") },
    { href: `/${locale}/suplementos`, label: t("supplements") },
    { href: `/${locale}/protocolos`, label: t("protocols") },
  ];

  return (
    <header className="sticky top-0 bg-bg/90 backdrop-blur-md border-b border-hairline z-50">
      <div className="max-w-[1200px] mx-auto px-8 flex items-center justify-between h-[72px]">
        <Link
          href={`/${locale}`}
          className="group flex items-baseline gap-2"
        >
          <span className="font-serif text-[22px] font-normal text-charcoal tracking-[-0.01em] group-hover:text-emerald transition-colors">
            BiohackLab
          </span>
          <span className="text-[9px] tracking-[0.25em] uppercase text-bronze mt-1 hidden sm:inline">
            Longevity
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-[12px] tracking-[0.08em] uppercase text-stone hover:text-emerald transition-colors font-medium"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
