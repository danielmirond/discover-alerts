import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { getArticlesByLocale } from "@/lib/content";
import { ArticleCard } from "@/components/ArticleCard";
import { NewsletterEmbed } from "@/components/NewsletterEmbed";

const categoryHrefs: Record<string, Record<string, string>> = {
  es: { protocols: "protocolos", skin: "skin", mind: "mente", tribe: "tribu", rest: "reposo", practitioners: "practitioners", ingredients: "ingredientes" },
  en: { protocols: "protocols", skin: "skin", mind: "mind", tribe: "tribe", rest: "rest", practitioners: "practitioners", ingredients: "ingredients" },
  fr: { protocols: "protocoles", skin: "skin", mind: "esprit", tribe: "tribu", rest: "repos", practitioners: "practitioners", ingredients: "ingredients" },
  de: { protocols: "protokolle", skin: "skin", mind: "geist", tribe: "gemeinschaft", rest: "erholung", practitioners: "practitioners", ingredients: "inhaltsstoffe" },
};

const categoryConfig = [
  { key: "protocols", number: "I" },
  { key: "skin", number: "II" },
  { key: "mind", number: "III" },
  { key: "tribe", number: "IV" },
  { key: "rest", number: "V" },
  { key: "practitioners", number: "VI" },
] as const;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeContent locale={locale} />;
}

function HomeContent({ locale }: { locale: string }) {
  const t = useTranslations();
  const articles = getArticlesByLocale(locale);
  const featured = articles[0];
  const rest = articles.slice(1, 5);

  const heroWords = t("home.hero").split(" ");
  const lastTwo = heroWords.slice(-2).join(" ");
  const rest_ = heroWords.slice(0, -2).join(" ");

  return (
    <div className="animate-fade-up">
      {/* HERO */}
      <section className="max-w-[1200px] mx-auto px-8 pt-24 pb-32">
        <div className="max-w-[920px]">
          <div className="flex items-center gap-4 mb-10">
            <span className="h-px w-12 bg-bronze" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-bronze font-medium">
              {t("site.tagline")}
            </span>
          </div>

          <h1 className="display-brand mb-10 text-charcoal">
            {t("home.hero")}
          </h1>

          <p className="font-serif italic text-[22px] md:text-[26px] text-stone leading-[1.4] max-w-[640px] mb-14 font-light tracking-[-0.005em]">
            {t("home.heroSub")}
          </p>

          <div className="flex items-center gap-6 flex-wrap">
            <Link href={`/${locale}/${(categoryHrefs[locale] || categoryHrefs.en).protocols}`} className="btn-primary">
              {t("home.readMore")}
            </Link>
            <Link
              href={`/${locale}/about`}
              className="text-[11px] text-bronze tracking-[0.2em] uppercase border-b border-bronze/30 hover:border-bronze pb-1 transition-colors"
            >
              {locale === "es" ? "La metodología"
                : locale === "fr" ? "La méthodologie"
                : locale === "de" ? "Die Methode"
                : "The methodology"}
            </Link>
            <div className="flex items-center gap-3 text-[10px] text-stone tracking-[0.2em] uppercase ml-auto">
              <span>ES · EN · FR · DE</span>
            </div>
          </div>
        </div>
      </section>

      {/* DIVIDER ORNAMENT */}
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="ornament text-[10px] tracking-[0.3em] uppercase">
          <span className="font-serif italic text-[14px] normal-case tracking-normal">
            Est. 2026
          </span>
        </div>
      </div>

      {/* CATEGORIES */}
      <section className="max-w-[1200px] mx-auto px-8 py-24">
        <div className="flex items-baseline justify-between mb-12">
          <div>
            <div className="eyebrow mb-3">Collections</div>
            <h2 className="display-lg">{t("home.categories")}</h2>
          </div>
          <span className="font-serif italic text-stone text-[14px] hidden md:inline">
            Six pillars of longevity
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[1px] bg-line">
          {categoryConfig.map(({ key, number }) => (
            <Link
              key={key}
              href={`/${locale}/${(categoryHrefs[locale] || categoryHrefs.en)[key]}`}
              className="bg-bg group p-10 hover:bg-ivory transition-colors"
            >
              <div className="font-serif italic text-[52px] font-extralight text-bronze/60 mb-6 group-hover:text-emerald transition-colors">
                {number}
              </div>
              <h3 className="font-serif text-[24px] font-normal text-charcoal mb-3 group-hover:text-emerald transition-colors">
                {t(`categories.${key}.title`)}
              </h3>
              <p className="text-stone text-[14px] leading-[1.7] mb-8">
                {t(`categories.${key}.description`)}
              </p>
              <span className="text-[11px] text-bronze tracking-[0.2em] uppercase flex items-center gap-2">
                Explore
                <span className="w-6 h-px bg-bronze group-hover:w-10 transition-all" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED ARTICLE */}
      {featured && (
        <section className="bg-pearl py-24 px-8">
          <div className="max-w-[1200px] mx-auto">
            <div className="eyebrow mb-3">Editor&rsquo;s pick</div>
            <h2 className="display-lg mb-12">{t("home.latestArticles")}</h2>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-[1px] bg-line">
              <div className="lg:col-span-3 bg-bg">
                <ArticleCard article={featured} locale={locale} featured />
              </div>
              <div className="lg:col-span-2 flex flex-col bg-line gap-[1px]">
                {rest.slice(0, 3).map((article) => (
                  <div key={article.slug} className="bg-bg flex-1">
                    <ArticleCard article={article} locale={locale} />
                  </div>
                ))}
              </div>
            </div>

            {rest.length > 3 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-line mt-[1px]">
                {rest.slice(3).map((article) => (
                  <div key={article.slug} className="bg-bg">
                    <ArticleCard article={article} locale={locale} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* SIX PILLARS */}
      <section className="bg-ivory py-24 px-8 border-y border-hairline">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-baseline justify-between mb-12">
            <div>
              <div className="eyebrow mb-3">Framework</div>
              <h2 className="display-lg">
                {locale === "es" ? "Los seis pilares"
                  : locale === "fr" ? "Les six piliers"
                  : locale === "de" ? "Die sechs Säulen"
                  : "The six pillars"}
              </h2>
            </div>
            <span className="font-serif italic text-stone text-[14px] hidden md:inline">
              {locale === "es" ? "Arquitectura de longevidad"
                : locale === "fr" ? "Architecture de longévité"
                : locale === "de" ? "Architektur der Langlebigkeit"
                : "Architecture of longevity"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[1px] bg-line">
            {categoryConfig.map(({ key, number }) => (
              <Link
                key={key}
                href={`/${locale}/${(categoryHrefs[locale] || categoryHrefs.en)[key]}`}
                className="bg-bg group p-8 hover:bg-pearl transition-colors"
              >
                <div className="font-serif italic text-[56px] font-extralight text-bronze/40 mb-5 leading-none group-hover:text-emerald transition-colors">
                  {number}
                </div>
                <h3 className="font-serif text-[20px] font-normal text-charcoal mb-3 group-hover:text-emerald transition-colors">
                  {t(`categories.${key}.title`)}
                </h3>
                <p className="text-stone text-[13px] leading-[1.7]">
                  {t(`categories.${key}.description`)}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* QUOTE / EDITORIAL MANIFESTO */}
      <section className="max-w-[900px] mx-auto px-8 py-32 text-center">
        <div className="eyebrow mb-8">
          {locale === "es" ? "Filosofía" : locale === "fr" ? "Philosophie" : locale === "de" ? "Philosophie" : "Philosophy"}
        </div>
        <blockquote className="font-serif text-[clamp(26px,3.5vw,40px)] font-extralight leading-[1.35] text-charcoal tracking-[-0.01em] italic">
          &ldquo;{locale === "es"
            ? "La longevidad no es un destino — es la arquitectura silenciosa de decisiones diarias, respaldadas por la ciencia"
            : locale === "fr"
            ? "La longévité n'est pas une destination — c'est l'architecture silencieuse de décisions quotidiennes, soutenues par la science"
            : locale === "de"
            ? "Langlebigkeit ist kein Ziel — sie ist die stille Architektur täglicher Entscheidungen, gestützt auf Wissenschaft"
            : "Longevity is not a destination — it's the quiet architecture of daily decisions, backed by science"}&rdquo;.
        </blockquote>
        <div className="ornament mt-10 text-[10px] tracking-[0.3em] uppercase max-w-[400px] mx-auto">
          <span>Aevum</span>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="max-w-[1200px] mx-auto px-8 pb-24">
        <NewsletterEmbed />
      </section>
    </div>
  );
}
