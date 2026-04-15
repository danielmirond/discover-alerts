import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { getArticlesByLocale } from "@/lib/content";
import { ArticleCard } from "@/components/ArticleCard";
import { NewsletterEmbed } from "@/components/NewsletterEmbed";

const categoryConfig = [
  {
    key: "wearables",
    icon: "⌚",
    color: "accent-green",
    href: "wearables",
  },
  {
    key: "supplements",
    icon: "💊",
    color: "accent-blue",
    href: "suplementos",
  },
  {
    key: "protocols",
    icon: "📋",
    color: "accent-purple",
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

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-12 animate-fade-up">
      {/* Hero */}
      <section className="mb-16">
        <div className="label-tag mb-4">{t("site.tagline")}</div>
        <h1 className="font-serif text-[clamp(36px,6vw,60px)] font-extralight text-white leading-[1.05] tracking-tight mb-3">
          {t("home.hero").split(" ").slice(0, -2).join(" ")}{" "}
          <em className="italic text-accent-blue">
            {t("home.hero").split(" ").slice(-2).join(" ")}
          </em>
        </h1>
        <p className="text-muted max-w-[520px] mb-8">{t("home.heroSub")}</p>

        {/* Language badges */}
        <div className="flex gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 px-3 py-1 bg-s1 border border-accent-green text-accent-green text-[11px]">
            🇪🇸 Español
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 bg-s1 border border-accent-blue text-accent-blue text-[11px]">
            🇬🇧 English
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 bg-s1 border border-accent-blue text-accent-blue text-[11px]">
            🇫🇷 Français
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 bg-s1 border border-accent-blue text-accent-blue text-[11px]">
            🇩🇪 Deutsch
          </span>
        </div>
      </section>

      {/* Categories */}
      <section className="mb-16">
        <h2 className="font-serif text-xl font-light text-white tracking-tight mb-5">
          {t("home.categories")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {categoryConfig.map(({ key, icon, color, href }) => (
            <Link
              key={key}
              href={`/${locale}/${href}`}
              className="card accent-left-green hover:bg-s2 transition-colors group"
              style={{
                borderLeftColor: `var(--${color})`,
              }}
            >
              <div className="text-2xl mb-2">{icon}</div>
              <h3 className="font-serif text-[15px] font-normal text-white mb-1">
                {t(`categories.${key}.title`)}
              </h3>
              <p className="text-muted text-[11px]">
                {t(`categories.${key}.description`)}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Latest Articles */}
      {articles.length > 0 && (
        <section className="mb-16">
          <h2 className="font-serif text-xl font-light text-white tracking-tight mb-5">
            {t("home.latestArticles")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {articles.slice(0, 4).map((article) => (
              <ArticleCard key={article.slug} article={article} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {/* Newsletter CTA */}
      <section>
        <NewsletterEmbed />
      </section>
    </div>
  );
}
