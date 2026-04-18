import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { getArticlesByCategory } from "@/lib/content";
import { ArticleCard } from "@/components/ArticleCard";

const categoryMap: Record<string, string> = {
  wearables: "wearables",
  suplementos: "supplements",
  supplements: "supplements",
  protocolos: "protocols",
  protocols: "protocols",
  belleza: "beauty",
  beauty: "beauty",
  beaute: "beauty",
  schoenheit: "beauty",
};

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[1px] bg-line">
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
