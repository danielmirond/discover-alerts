import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";

export function Footer() {
  const t = useTranslations("footer");
  const locale = useLocale();

  return (
    <footer className="bg-ivory border-t border-hairline mt-24">
      <div className="max-w-[1200px] mx-auto px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          {/* Brand */}
          <div className="md:col-span-5">
            <div className="flex items-baseline gap-2 mb-6">
              <span className="font-serif text-[28px] font-normal text-charcoal tracking-[-0.01em]">
                BiohackLab
              </span>
              <span className="text-[9px] tracking-[0.25em] uppercase text-bronze">
                Longevity
              </span>
            </div>
            <p className="text-stone text-[14px] leading-[1.7] max-w-[360px]">
              {t("about")}
            </p>
          </div>

          {/* Categories */}
          <div className="md:col-span-3">
            <div className="eyebrow mb-5">{t("categories")}</div>
            <div className="flex flex-col gap-3">
              <Link
                href={`/${locale}/wearables`}
                className="text-[13px] text-slate hover:text-emerald transition-colors"
              >
                Wearables & Tracking
              </Link>
              <Link
                href={`/${locale}/suplementos`}
                className="text-[13px] text-slate hover:text-emerald transition-colors"
              >
                {locale === "es" ? "Suplementos"
                  : locale === "fr" ? "Suppléments"
                  : "Supplements"}
              </Link>
              <Link
                href={`/${locale}/protocolos`}
                className="text-[13px] text-slate hover:text-emerald transition-colors"
              >
                {locale === "es" ? "Protocolos"
                  : locale === "fr" ? "Protocoles"
                  : locale === "de" ? "Protokolle"
                  : "Protocols"}
              </Link>
            </div>
          </div>

          {/* Legal */}
          <div className="md:col-span-4">
            <div className="eyebrow mb-5">{t("legal")}</div>
            <div className="flex flex-col gap-3">
              <span className="text-[13px] text-stone">{t("privacy")}</span>
              <span className="text-[13px] text-stone">{t("terms")}</span>
              <span className="text-[13px] text-stone">{t("affiliate")}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-hairline pt-8 flex items-center justify-between text-[11px] text-stone">
          <span>&copy; {new Date().getFullYear()} BiohackLab</span>
          <span className="tracking-[0.2em] uppercase text-bronze">
            {t("allRights")}
          </span>
        </div>
      </div>
    </footer>
  );
}
