import { Metadata } from "next";
import { useTranslations } from "next-intl";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getHaraArticlesByCategory } from "@/lib/content";
import { ArticleCard } from "@/components/ArticleCard";

const categoryMap: Record<string, string> = {
  "k-beauty": "k-beauty",
  "bebidas-funcionales": "functional-drinks",
  "functional-drinks": "functional-drinks",
  "boissons-fonctionnelles": "functional-drinks",
  "funktionale-getraenke": "functional-drinks",
  "healthspan-asiatico": "asian-healthspan",
  "asian-healthspan": "asian-healthspan",
  "sante-asiatique": "asian-healthspan",
  "asiatische-gesundheit": "asian-healthspan",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}): Promise<Metadata> {
  const { locale, category } = await params;
  const categoryKey = categoryMap[category] || category;
  const t = await getTranslations({ locale });
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://byaevum.com";

  const title = `${t(`hara.categories.${categoryKey}.title`)} — Hara by Aevum`;
  const description = t(`hara.categories.${categoryKey}.description`);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}/hara/${category}`,
      type: "website",
      locale,
    },
    alternates: {
      canonical: `${SITE_URL}/${locale}/hara/${category}`,
    },
  };
}

export default async function HaraCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale, category } = await params;
  setRequestLocale(locale);

  return <HaraCategoryContent locale={locale} category={category} />;
}

function HaraCategoryContent({
  locale,
  category,
}: {
  locale: string;
  category: string;
}) {
  const t = useTranslations();
  const categoryKey = categoryMap[category] || category;
  const articles = getHaraArticlesByCategory(locale, category);

  return (
    <div className="animate-fade-up">
      <section className="max-w-[1200px] mx-auto px-8 pt-20 pb-16 border-b border-hairline">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-[10px] tracking-[0.22em] uppercase text-bengara font-medium">Hara</span>
          <span className="text-mist">·</span>
          <span className="text-[10px] tracking-[0.22em] uppercase text-matcha font-medium">
            {t(`hara.categories.${categoryKey}.title`)}
          </span>
        </div>
        <h1 className="display-lg mb-6">
          {t(`hara.categories.${categoryKey}.title`)}
        </h1>
        <p className="text-[17px] text-slate leading-[1.6] max-w-[620px] font-light">
          {t(`hara.categories.${categoryKey}.description`)}
        </p>
      </section>

      <section className="max-w-[1200px] mx-auto px-8 py-16">
        {articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {articles.map((article) => (
              <div key={article.slug} className="bg-bg">
                <ArticleCard article={article} locale={locale} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card-ivory p-16 text-center">
            <div className="font-serif italic text-[24px] text-stone">
              {locale === "es"
                ? "Próximamente nuevos artículos"
                : locale === "fr"
                ? "De nouveaux articles arrivent bientôt"
                : locale === "de"
                ? "Neue Artikel folgen in Kürze"
                : "New articles coming soon"}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
