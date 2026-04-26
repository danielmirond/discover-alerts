"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";

export function Header() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  const aboutLabel =
    locale === "es" ? "Sobre"
    : locale === "fr" ? "À propos"
    : locale === "de" ? "Über"
    : "About";

  const paths: Record<string, Record<string, string>> = {
    es: { protocols: "protocolos", skin: "skin", mind: "mente", tribe: "tribu", rest: "reposo", practitioners: "practitioners", ingredients: "ingredientes" },
    en: { protocols: "protocols", skin: "skin", mind: "mind", tribe: "tribe", rest: "rest", practitioners: "practitioners", ingredients: "ingredients" },
    fr: { protocols: "protocoles", skin: "skin", mind: "esprit", tribe: "tribu", rest: "repos", practitioners: "practitioners", ingredients: "ingredients" },
    de: { protocols: "protokolle", skin: "skin", mind: "geist", tribe: "gemeinschaft", rest: "erholung", practitioners: "practitioners", ingredients: "inhaltsstoffe" },
  };
  const p = paths[locale] || paths.en;

  const links = [
    { href: `/${locale}/${p.protocols}`, label: t("protocols") },
    { href: `/${locale}/${p.skin}`, label: t("skin") },
    { href: `/${locale}/${p.mind}`, label: t("mind") },
    { href: `/${locale}/${p.tribe}`, label: t("tribe") },
    { href: `/${locale}/${p.rest}`, label: t("rest") },
    { href: `/${locale}/${p.ingredients}`, label: t("ingredients") },
    { href: `/${locale}/hara`, label: t("hara") },
    { href: `/${locale}/${p.practitioners}`, label: t("practitioners") },
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

        <nav className="hidden lg:flex items-center gap-8">
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

        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden flex flex-col justify-center items-center w-10 h-10 gap-[5px]"
            aria-label="Menu"
          >
            <span className={`block w-5 h-px bg-charcoal transition-all duration-300 ${open ? "rotate-45 translate-y-[3px]" : ""}`} />
            <span className={`block w-5 h-px bg-charcoal transition-all duration-300 ${open ? "-rotate-45 -translate-y-[3px]" : ""}`} />
          </button>
        </div>
      </div>

      {open && (
        <nav className="lg:hidden border-t border-hairline bg-bg/95 backdrop-blur-md">
          <div className="max-w-[1200px] mx-auto px-8 py-6 flex flex-col gap-1">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="text-[12px] tracking-[0.12em] uppercase text-stone hover:text-emerald transition-colors font-medium py-3 border-b border-hairline last:border-0"
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
