import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import Link from "next/link";

export function Footer() {
  const t = useTranslations("footer");
  const locale = useLocale();

  return (
    <footer className="border-t border-border bg-s1 relative z-[1]">
      <div className="max-w-[1000px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          {/* About */}
          <div>
            <div className="font-serif text-lg font-extralight text-white mb-3">
              BiohackLab
            </div>
            <p className="text-muted text-[11px] leading-relaxed">{t("about")}</p>
          </div>

          {/* Categories */}
          <div>
            <div className="text-[9px] tracking-[0.2em] uppercase text-muted mb-4">
              {t("categories")}
            </div>
            <div className="flex flex-col gap-2">
              <Link
                href={`/${locale}/wearables`}
                className="text-[11px] text-text hover:text-accent-blue transition-colors"
              >
                Wearables & Tracking
              </Link>
              <Link
                href={`/${locale}/suplementos`}
                className="text-[11px] text-text hover:text-accent-blue transition-colors"
              >
                {locale === "es"
                  ? "Suplementos"
                  : locale === "fr"
                  ? "Suppléments"
                  : locale === "de"
                  ? "Supplements"
                  : "Supplements"}
              </Link>
              <Link
                href={`/${locale}/protocolos`}
                className="text-[11px] text-text hover:text-accent-blue transition-colors"
              >
                {locale === "es"
                  ? "Protocolos"
                  : locale === "fr"
                  ? "Protocoles"
                  : locale === "de"
                  ? "Protokolle"
                  : "Protocols"}
              </Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <div className="text-[9px] tracking-[0.2em] uppercase text-muted mb-4">
              {t("legal")}
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] text-muted">{t("privacy")}</span>
              <span className="text-[11px] text-muted">{t("terms")}</span>
              <span className="text-[11px] text-muted">{t("affiliate")}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-6 text-center text-[10px] text-muted">
          &copy; {new Date().getFullYear()} BiohackLab. {t("allRights")}
        </div>
      </div>
    </footer>
  );
}
