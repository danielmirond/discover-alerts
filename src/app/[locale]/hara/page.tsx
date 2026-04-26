import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { getHaraAllArticles } from "@/lib/content";
import { ArticleCard } from "@/components/ArticleCard";

const haraHrefs: Record<string, Record<string, string>> = {
  es: { "k-beauty": "k-beauty", "functional-drinks": "bebidas-funcionales", "asian-healthspan": "healthspan-asiatico" },
  en: { "k-beauty": "k-beauty", "functional-drinks": "functional-drinks", "asian-healthspan": "asian-healthspan" },
  fr: { "k-beauty": "k-beauty", "functional-drinks": "boissons-fonctionnelles", "asian-healthspan": "sante-asiatique" },
  de: { "k-beauty": "k-beauty", "functional-drinks": "funktionale-getraenke", "asian-healthspan": "asiatische-gesundheit" },
};

const pillarConfig = [
  { key: "k-beauty", number: "一" },
  { key: "functional-drinks", number: "二" },
  { key: "asian-healthspan", number: "三" },
] as const;

export default async function HaraPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HaraContent locale={locale} />;
}

function HaraContent({ locale }: { locale: string }) {
  const t = useTranslations();
  const articles = getHaraAllArticles(locale);
  const h = haraHrefs[locale] || haraHrefs.en;

  return (
    <div className="animate-fade-up">
      {/* HERO */}
      <section className="max-w-[1200px] mx-auto px-8 pt-24 pb-20">
        <div className="max-w-[920px]">
          <div className="flex items-center gap-4 mb-10">
            <span className="h-px w-12 bg-bengara" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-bengara font-medium">
              {t("hara.tagline")}
            </span>
          </div>

          <h1 className="font-hara-display font-normal text-charcoal tracking-[-0.03em] leading-[1] mb-4" style={{ fontSize: "clamp(64px, 10vw, 120px)" }}>
            Hara<span className="text-bengara">.</span>
          </h1>
          <p className="font-hara-mono text-[11px] tracking-[0.16em] uppercase text-ash mb-3">
            腹 · ハラ · 복부
          </p>
          <p className="font-hara-display italic text-[15px] text-ash mb-10">
            a Byaevum publication
          </p>

          <p className="font-hara-body text-[17px] text-charcoal/80 leading-[1.65] max-w-[640px]">
            {t("hara.description")}
          </p>
        </div>
      </section>

      {/* DIVIDER */}
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="flex items-center gap-4 text-bengara">
          <span className="flex-1 h-px bg-bengara/30" />
          <span className="font-serif italic text-[14px] normal-case tracking-normal">
            {locale === "es" ? "Tres pilares" : locale === "fr" ? "Trois piliers" : locale === "de" ? "Drei Säulen" : "Three pillars"}
          </span>
          <span className="flex-1 h-px bg-bengara/30" />
        </div>
      </div>

      {/* THREE PILLARS */}
      <section className="max-w-[1200px] mx-auto px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          {pillarConfig.map(({ key, number }) => (
            <Link
              key={key}
              href={`/${locale}/hara/${h[key]}`}
              className="bg-bg group p-10 hover:bg-bengara-tint transition-colors"
            >
              <div className="font-serif italic text-[52px] font-extralight text-bengara/50 mb-6 group-hover:text-bengara transition-colors">
                {number}
              </div>
              <h3 className="font-serif text-[24px] font-normal text-charcoal mb-3 group-hover:text-bengara transition-colors">
                {t(`hara.categories.${key}.title`)}
              </h3>
              <p className="text-stone text-[14px] leading-[1.7] mb-8">
                {t(`hara.categories.${key}.description`)}
              </p>
              <span className="text-[11px] text-bengara tracking-[0.2em] uppercase flex items-center gap-2">
                {locale === "es" ? "Explorar" : locale === "fr" ? "Explorer" : locale === "de" ? "Entdecken" : "Explore"}
                <span className="w-6 h-px bg-bengara group-hover:w-10 transition-all" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* LATEST ARTICLES */}
      {articles.length > 0 && (
        <section className="bg-bengara-tint py-24 px-8">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-[10px] tracking-[0.22em] uppercase text-bengara font-medium mb-3">Hara</div>
            <h2 className="display-lg mb-12">
              {locale === "es" ? "Últimas publicaciones" : locale === "fr" ? "Dernières publications" : locale === "de" ? "Neueste Artikel" : "Latest articles"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {articles.slice(0, 6).map((article) => (
                <div key={article.slug} className="bg-bg">
                  <ArticleCard article={article} locale={locale} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
