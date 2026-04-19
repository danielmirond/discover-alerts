"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";

const text: Record<string, { message: string; accept: string; reject: string; more: string }> = {
  es: {
    message: "Usamos cookies esenciales y analíticas anónimas para mejorar tu experiencia.",
    accept: "Aceptar",
    reject: "Solo necesarias",
    more: "Política de cookies",
  },
  en: {
    message: "We use essential and anonymous analytics cookies to improve your experience.",
    accept: "Accept",
    reject: "Necessary only",
    more: "Cookie policy",
  },
  fr: {
    message: "Nous utilisons des cookies essentiels et analytiques anonymes pour améliorer votre expérience.",
    accept: "Accepter",
    reject: "Nécessaires uniquement",
    more: "Politique de cookies",
  },
  de: {
    message: "Wir verwenden essenzielle und anonyme Analyse-Cookies, um dein Erlebnis zu verbessern.",
    accept: "Akzeptieren",
    reject: "Nur notwendige",
    more: "Cookie-Richtlinie",
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
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-charcoal/95 backdrop-blur-sm border-t border-bronze/20 animate-fade-up"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="max-w-[1200px] mx-auto px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-bg/90 text-[13px] leading-[1.6] flex-1">
          {t.message}{" "}
          <Link
            href={`/${locale}/cookies`}
            className="text-bronze underline underline-offset-2 decoration-bronze/40 hover:decoration-bronze transition-all"
          >
            {t.more}
          </Link>
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => handleConsent("necessary")}
            className="text-bg/60 text-[12px] tracking-[0.1em] uppercase hover:text-bg transition-colors px-4 py-2.5 border border-bg/20 hover:border-bg/40"
          >
            {t.reject}
          </button>
          <button
            onClick={() => handleConsent("all")}
            className="bg-bronze text-bg text-[12px] tracking-[0.1em] uppercase font-medium px-5 py-2.5 hover:bg-bronze/80 transition-colors"
          >
            {t.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
