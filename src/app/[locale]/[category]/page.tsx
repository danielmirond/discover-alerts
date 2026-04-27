import { Metadata } from "next";
import { useTranslations } from "next-intl";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getArticlesByCategory } from "@/lib/content";
import { ArticleCard } from "@/components/ArticleCard";

const categoryMap: Record<string, string> = {
  // New pillars - ES
  protocolos: "protocols",
  skin: "skin",
  mente: "mind",
  tribu: "tribe",
  reposo: "rest",
  practitioners: "practitioners",
  journal: "journal",
  // New pillars - EN
  protocols: "protocols",
  mind: "mind",
  tribe: "tribe",
  rest: "rest",
  // New pillars - FR
  protocoles: "protocols",
  esprit: "mind",
  repos: "rest",
  // New pillars - DE
  protokolle: "protocols",
  geist: "mind",
  gemeinschaft: "tribe",
  erholung: "rest",
  // Ingredients vertical
  ingredientes: "ingredients",
  ingredients: "ingredients",
  inhaltsstoffe: "ingredients",
  // Legacy categories (keep with own keys so titles display correctly)
  wearables: "wearables",
  suplementos: "supplements",
  supplements: "supplements",
  belleza: "beauty",
  beauty: "beauty",
  beaute: "beauty",
  schoenheit: "beauty",
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

  const title = `${t(`categories.${categoryKey}.title`)} — Aevum`;
  const description = t(`categories.${categoryKey}.description`);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}/${category}`,
      type: "website",
      locale,
    },
    alternates: {
      canonical: `${SITE_URL}/${locale}/${category}`,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale, category } = await params;
  setRequestLocale(locale);

  return <CategoryContent locale={locale} category={category} />;
}

function CategoryContent({
  locale,
  category,
}: {
  locale: string;
  category: string;
}) {
  const t = useTranslations();
  const categoryKey = categoryMap[category] || category;
  const articles = getArticlesByCategory(locale, category);

  return (
    <div className="animate-fade-up">
      {/* HEADER */}
      <section className="max-w-[1200px] mx-auto px-8 pt-20 pb-16 border-b border-hairline">
        <div className="eyebrow mb-6">Collection</div>
        <h1 className="display-lg mb-6">
          {t(`categories.${categoryKey}.title`)}
        </h1>
        <p className="text-[17px] text-slate leading-[1.6] max-w-[620px] font-light">
          {t(`categories.${categoryKey}.description`)}
        </p>
      </section>

      {/* ARTICLES GRID */}
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
                ? "Próximamente nuevos artículos en esta categoría"
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
