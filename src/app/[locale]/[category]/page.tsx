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
  protocoles: "protocols",
  protokolle: "protocols",
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
    <div className="max-w-[1000px] mx-auto px-6 py-12 animate-fade-up">
      <div className="label-tag mb-4">
        {t(`categories.${categoryKey}.title`)}
      </div>
      <h1 className="font-serif text-3xl font-extralight text-white tracking-tight mb-3">
        {t(`categories.${categoryKey}.title`)}
      </h1>
      <p className="text-muted max-w-[600px] mb-10">
        {t(`categories.${categoryKey}.description`)}
      </p>

      {articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {articles.map((article) => (
            <ArticleCard key={article.slug} article={article} locale={locale} />
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <p className="text-muted text-sm">
            {locale === "es"
              ? "Próximamente nuevos artículos en esta categoría."
              : locale === "fr"
              ? "De nouveaux articles arrivent bientôt dans cette catégorie."
              : locale === "de"
              ? "Neue Artikel in dieser Kategorie folgen in Kürze."
              : "New articles coming soon in this category."}
          </p>
        </div>
      )}
    </div>
  );
}
