import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  const t = useTranslations("footer");
  const locale = useLocale();

  const paths: Record<string, { supplements: string; protocols: string; beauty: string }> = {
    es: { supplements: "suplementos", protocols: "protocolos", beauty: "belleza" },
    en: { supplements: "supplements", protocols: "protocols", beauty: "beauty" },
    fr: { supplements: "supplements", protocols: "protocols", beauty: "beaute" },
    de: { supplements: "supplements", protocols: "protocols", beauty: "schoenheit" },
  };
  const p = paths[locale] || paths.en;

  return (
    <footer className="bg-ivory border-t border-hairline mt-24">
      <div className="max-w-[1200px] mx-auto px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          <div className="md:col-span-5">
            <div className="mb-7">
              <Logo variant="full" size={36} />
            </div>
            <div className="flex items-center gap-3 mb-6 text-[10px] tracking-[0.25em] uppercase text-stone">
              <span>Precision longevity</span>
              <span className="w-1 h-1 rounded-full bg-bronze" />
              <span>Est. 2026</span>
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
                href={`/${locale}/${p.supplements}`}
                className="text-[13px] text-slate hover:text-emerald transition-colors"
              >
                {locale === "es" ? "Suplementación"
                  : locale === "fr" ? "Supplémentation"
                  : locale === "de" ? "Supplementierung"
                  : "Supplementation"}
              </Link>
              <Link
                href={`/${locale}/${p.protocols}`}
                className="text-[13px] text-slate hover:text-emerald transition-colors"
              >
                {locale === "es" ? "Protocolos & Ciencia"
                  : locale === "fr" ? "Protocoles & Science"
                  : locale === "de" ? "Protokolle & Wissenschaft"
                  : "Protocols & Science"}
              </Link>
              <Link
                href={`/${locale}/${p.beauty}`}
                className="text-[13px] text-slate hover:text-emerald transition-colors"
              >
                {locale === "es" ? "Skin Longevity"
                  : locale === "fr" ? "Beauté & Longévité"
                  : locale === "de" ? "Hautalterung"
                  : "Skin Longevity"}
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
              <Link
                href={`/${locale}/privacidad`}
                className="text-[13px] text-slate hover:text-emerald transition-colors"
              >
                {t("privacy")}
              </Link>
              <Link
                href={`/${locale}/cookies`}
                className="text-[13px] text-slate hover:text-emerald transition-colors"
              >
                Cookies
              </Link>
              <Link
                href={`/${locale}/afiliacion`}
                className="text-[13px] text-slate hover:text-emerald transition-colors"
              >
                {t("affiliate")}
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-hairline pt-8 flex items-center justify-between">
          <span className="text-[11px] text-stone font-mono tracking-[0.05em]">
            0.785 AE — [HSPAN]
          </span>
          <span className="text-[11px] text-stone tracking-[0.2em] uppercase">
            &copy; {new Date().getFullYear()} &nbsp;·&nbsp; {t("allRights")}
          </span>
        </div>
      </div>
    </footer>
  );
}
