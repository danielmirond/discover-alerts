"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";

const text: Record<
  string,
  {
    title: string;
    message: string;
    accept: string;
    reject: string;
    more: string;
    ariaLabel: string;
  }
> = {
  es: {
    title: "Privacidad y cookies",
    message:
      "Aevum usa cookies estrictamente necesarias y analítica anónima (sin rastreo personal). Puedes aceptar o rechazar — ambas opciones tienen el mismo peso.",
    accept: "Aceptar todas",
    reject: "Rechazar",
    more: "Leer política",
    ariaLabel: "Consentimiento de cookies",
  },
  en: {
    title: "Privacy & cookies",
    message:
      "Aevum uses strictly necessary cookies and anonymous analytics (no personal tracking). You can accept or reject — both options carry equal weight.",
    accept: "Accept all",
    reject: "Reject",
    more: "Read policy",
    ariaLabel: "Cookie consent",
  },
  fr: {
    title: "Confidentialité & cookies",
    message:
      "Aevum utilise des cookies strictement nécessaires et des analyses anonymes (aucun suivi personnel). Vous pouvez accepter ou refuser — les deux options ont le même poids.",
    accept: "Tout accepter",
    reject: "Refuser",
    more: "Lire la politique",
    ariaLabel: "Consentement aux cookies",
  },
  de: {
    title: "Datenschutz & Cookies",
    message:
      "Aevum verwendet unbedingt erforderliche Cookies und anonyme Analysen (kein persönliches Tracking). Du kannst akzeptieren oder ablehnen — beide Optionen sind gleichwertig.",
    accept: "Alle akzeptieren",
    reject: "Ablehnen",
    more: "Richtlinie lesen",
    ariaLabel: "Cookie-Einwilligung",
  },
};

export function CookieBanner() {
  const locale = useLocale();
  const [visible, setVisible] = useState(false);
  const t = text[locale] || text.en;

  useEffect(() => {
    const consent = localStorage.getItem("aevum-cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleConsent(value: "all" | "necessary") {
    localStorage.setItem("aevum-cookie-consent", value);
    localStorage.setItem("aevum-cookie-consent-date", new Date().toISOString());
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-auto md:max-w-[440px] z-50 bg-bg border border-line shadow-[0_12px_40px_rgba(10,10,10,0.12)] animate-fade-up"
      role="dialog"
      aria-modal="false"
      aria-label={t.ariaLabel}
    >
      <div className="p-6 md:p-7">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-6 h-px bg-bronze" />
          <span className="eyebrow">{t.title}</span>
        </div>

        <p className="text-slate text-[13.5px] leading-[1.65] mb-6">
          {t.message}
        </p>

        {/* Equal prominence: same size, same weight, same style.
            Only difference: reject is neutral bg, accept is charcoal bg.
            Reject is listed first (reduces implicit preference bias). */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => handleConsent("necessary")}
            className="flex-1 bg-bg text-charcoal text-[12px] tracking-[0.1em] uppercase font-medium px-5 py-3 border border-charcoal hover:bg-charcoal hover:text-bg transition-colors"
          >
            {t.reject}
          </button>
          <button
            onClick={() => handleConsent("all")}
            className="flex-1 bg-charcoal text-bg text-[12px] tracking-[0.1em] uppercase font-medium px-5 py-3 border border-charcoal hover:bg-bronze hover:border-bronze transition-colors"
          >
            {t.accept}
          </button>
        </div>

        <Link
          href={`/${locale}/cookies`}
          className="text-[11px] text-stone tracking-[0.1em] uppercase hover:text-bronze transition-colors border-b border-transparent hover:border-bronze pb-px"
        >
          {t.more} →
        </Link>
      </div>
    </div>
  );
}
