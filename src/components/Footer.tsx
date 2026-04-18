import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  const t = useTranslations("footer");
  const locale = useLocale();

  return (
    <footer className="bg-ivory border-t border-hairline mt-24">
      <div className="max-w-[1200px] mx-auto px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          <div className="md:col-span-5">
            <div className="flex items-center gap-4 mb-6">
              <Logo variant="mark" size={32} color="#1a1a1a" />
              <div className="flex items-baseline gap-3">
                <Logo variant="wordmark" size={12} color="#1a1a1a" />
                <span className="w-px h-5 bg-line" />
                <span className="text-[9px] tracking-[0.3em] uppercase text-stone">
                  Est. 2026
                </span>
              </div>
            </div>
            <p className="text-stone text-[13px] leading-[1.75] max-w-[380px]">
              {t("about")}
            </p>
          </div>

          <div className="md:col-span-3">
            <div className="eyebrow mb-5">{t("categories")}</div>
            <div className="flex flex-col gap-3">
              <Link
                href={`/${locale}/wearables`}
                className="text-[13px] text-slate hover:text-emerald transition-colors"
              >
                {locale === "es" ? "Biomarcadores & Tracking"
                  : locale === "fr" ? "Biomarqueurs & Suivi"
                  : locale === "de" ? "Biomarker & Tracking"
                  : "Biomarkers & Tracking"}
              </Link>
              <Link
                href={`/${locale}/suplementos`}
                className="text-[13px] text-slate hover:text-emerald transition-colors"
              >
                {locale === "es" ? "Suplementación"
                  : locale === "fr" ? "Supplémentation"
                  : "Supplementation"}
              </Link>
              <Link
                href={`/${locale}/protocolos`}
                className="text-[13px] text-slate hover:text-emerald transition-colors"
              >
                {locale === "es" ? "Protocolos & Ciencia"
                  : locale === "fr" ? "Protocoles & Science"
                  : locale === "de" ? "Protokolle & Wissenschaft"
                  : "Protocols & Science"}
              </Link>
            </div>
          </div>

          <div className="md:col-span-4">
            <div className="eyebrow mb-5">{t("legal")}</div>
            <div className="flex flex-col gap-3">
              <Link
                href={`/${locale}/about`}
                className="text-[13px] text-slate hover:text-emerald transition-colors"
              >
                {locale === "es" ? "Sobre Aevum"
                  : locale === "fr" ? "À propos d'Aevum"
                  : locale === "de" ? "Über Aevum"
                  : "About Aevum"}
              </Link>
              <span className="text-[13px] text-stone">{t("privacy")}</span>
              <span className="text-[13px] text-stone">{t("terms")}</span>
              <span className="text-[13px] text-stone">{t("affiliate")}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-hairline pt-8 flex items-center justify-between text-[11px] text-stone">
          <span>&copy; {new Date().getFullYear()} Aevum</span>
          <span className="tracking-[0.2em] uppercase text-bronze">
            {t("allRights")}
          </span>
        </div>
      </div>
    </footer>
  );
}
