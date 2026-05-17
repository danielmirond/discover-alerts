import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  const t = useTranslations("footer");
  const locale = useLocale();

  const paths: Record<string, Record<string, string>> = {
    es: { protocols: "protocolos", skin: "skin", mind: "mente", tribe: "tribu", rest: "reposo", practitioners: "practitioners", ingredients: "ingredientes" },
    en: { protocols: "protocols", skin: "skin", mind: "mind", tribe: "tribe", rest: "rest", practitioners: "practitioners", ingredients: "ingredients" },
  };
  const p = paths[locale] || paths.en;

  return (
    <footer className="bg-ivory border-t border-hairline mt-24">
      <div className="max-w-[1200px] mx-auto px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-16">
          <div className="md:col-span-4">
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

          <div className="md:col-span-4">
            <div className="eyebrow mb-5">{t("categories")}</div>
            <div className="flex flex-col gap-3">
              <Link
                href={`/${locale}/${p.protocols}`}
                className="text-[13px] text-slate hover:text-emerald transition-colors"
              >
                {locale === "es" ? "Protocolos & Ciencia"
                  : "Protocols & Science"}
              </Link>
              <Link
                href={`/${locale}/${p.skin}`}
                className="text-[13px] text-slate hover:text-emerald transition-colors"
              >
                Skin Longevity
              </Link>
              <Link
                href={`/${locale}/${p.mind}`}
                className="text-[13px] text-slate hover:text-emerald transition-colors"
              >
                {locale === "es" ? "Mente & Cognición"
                  : "Mind & Cognition"}
              </Link>
              <Link
                href={`/${locale}/${p.tribe}`}
                className="text-[13px] text-slate hover:text-emerald transition-colors"
              >
                {locale === "es" ? "Tribu & Conexión"
                  : "Tribe & Connection"}
              </Link>
              <Link
                href={`/${locale}/${p.rest}`}
                className="text-[13px] text-slate hover:text-emerald transition-colors"
              >
                {locale === "es" ? "Reposo & Recuperación"
                  : "Rest & Recovery"}
              </Link>
              <Link
                href={`/${locale}/${p.ingredients}`}
                className="text-[13px] text-slate hover:text-emerald transition-colors"
              >
                {locale === "es" ? "Ingredientes Longevity"
                  : "Longevity Ingredients"}
              </Link>
              <Link
                href={`/${locale}/${p.practitioners}`}
                className="text-[13px] text-slate hover:text-emerald transition-colors"
              >
                Practitioners
              </Link>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="eyebrow mb-5" style={{ color: "#a0392a" }}>Hara</div>
            <div className="flex flex-col gap-3">
              <Link
                href={`/${locale}/hara`}
                className="text-[13px] text-slate hover:text-bengara transition-colors"
              >
                {locale === "es" ? "Wellness asiático"
                  : "Asian wellness"}
              </Link>
              <Link
                href={`/${locale}/hara/k-beauty`}
                className="text-[13px] text-slate hover:text-bengara transition-colors"
              >
                K-Beauty
              </Link>
              <Link
                href={`/${locale}/hara/${locale === "es" ? "bebidas-funcionales" : "functional-drinks"}`}
                className="text-[13px] text-slate hover:text-bengara transition-colors"
              >
                {locale === "es" ? "Bebidas Funcionales"
                  : "Functional Drinks"}
              </Link>
              <Link
                href={`/${locale}/hara/${locale === "es" ? "healthspan-asiatico" : "asian-healthspan"}`}
                className="text-[13px] text-slate hover:text-bengara transition-colors"
              >
                {locale === "es" ? "Healthspan Asiático"
                  : "Asian Healthspan"}
              </Link>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="eyebrow mb-5">{t("legal")}</div>
            <div className="flex flex-col gap-3">
              <Link
                href={`/${locale}/about`}
                className="text-[13px] text-slate hover:text-emerald transition-colors"
              >
                {locale === "es" ? "Sobre Aevum"
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
