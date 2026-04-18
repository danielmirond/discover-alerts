import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { getArticlesByLocale } from "@/lib/content";
import { ArticleCard } from "@/components/ArticleCard";
import { NewsletterEmbed } from "@/components/NewsletterEmbed";

const categoryConfig = [
  {
    key: "wearables",
    number: "01",
    href: "wearables",
  },
  {
    key: "supplements",
    number: "02",
    href: "suplementos",
  },
  {
    key: "protocols",
    number: "03",
    href: "protocolos",
  },
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
      <section className="max-w-[1200px] mx-auto px-8 pt-20 pb-32">
        <div className="max-w-[900px]">
          <div className="eyebrow mb-8">
            {t("site.tagline")} · {t("home.hero").split(" ")[0].toUpperCase()}
          </div>
          <h1 className="display-xl mb-10">
            {rest_}{" "}
            <em className="italic text-emerald font-light">
              {lastTwo}
            </em>
            .
          </h1>
          <p className="text-[18px] text-slate leading-[1.6] max-w-[560px] mb-12 font-light">
            {t("home.heroSub")}
          </p>

          <div className="flex items-center gap-5">
            <Link href={`/${locale}/wearables`} className="btn-primary">
              {t("home.readMore")}
            </Link>
            <div className="flex items-center gap-2 text-[11px] text-stone tracking-[0.15em] uppercase">
              <span className="w-8 h-px bg-bronze" />
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
            Three pillars of longevity
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-line">
          {categoryConfig.map(({ key, number, href }) => (
            <Link
              key={key}
              href={`/${locale}/${href}`}
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

      {/* QUOTE / EDITORIAL MANIFESTO */}
      <section className="max-w-[900px] mx-auto px-8 py-32 text-center">
        <div className="eyebrow mb-8">Filosofía</div>
        <blockquote className="font-serif text-[clamp(26px,3.5vw,40px)] font-extralight leading-[1.35] text-charcoal tracking-[-0.01em] italic">
          &ldquo;La longevidad no es un destino — es la arquitectura silenciosa de
          decisiones diarias, respaldadas por la ciencia&rdquo;.
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
