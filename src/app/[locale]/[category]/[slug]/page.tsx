import { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getArticle, getArticlesByCategory } from "@/lib/content";
import { locales } from "@/i18n/routing";
import { NewsletterEmbed } from "@/components/NewsletterEmbed";
import { AffiliateLink } from "@/components/AffiliateLink";
import { ArticleCard } from "@/components/ArticleCard";

const mdxComponents = {
  AffiliateLink,
  NewsletterEmbed,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, category, slug } = await params;
  const article = getArticle(locale, category, slug);

  if (!article) return {};

  return {
    title: article.meta.title,
    description: article.meta.description,
    alternates: {
      languages: Object.fromEntries(
        locales
          .map((l) => {
            const alt = article.meta.alternates?.[l];
            return alt ? [l, `/${l}/${alt}`] : null;
          })
          .filter(Boolean) as [string, string][]
      ),
    },
    openGraph: {
      title: article.meta.title,
      description: article.meta.description,
      type: "article",
      publishedTime: article.meta.date,
      modifiedTime: article.meta.updated,
      locale,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; category: string; slug: string }>;
}) {
  const { locale, category, slug } = await params;
  setRequestLocale(locale);
  const article = getArticle(locale, category, slug);

  if (!article) notFound();

  const related = getArticlesByCategory(locale, category)
    .filter((a) => a.slug !== slug)
    .slice(0, 2);

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      published: { es: "Publicado", en: "Published", fr: "Publié", de: "Veröffentlicht" },
      readTime: { es: "min de lectura", en: "min read", fr: "min de lecture", de: "Min. Lesezeit" },
      disclosure: {
        es: "Este artículo contiene enlaces de afiliado. Si compras a través de ellos, ganamos una comisión sin coste adicional para ti.",
        en: "This article contains affiliate links. If you purchase through them, we earn a commission at no extra cost to you.",
        fr: "Cet article contient des liens d'affiliation. Si vous achetez via ces liens, nous percevons une commission sans frais supplémentaires pour vous.",
        de: "Dieser Artikel enthält Affiliate-Links. Wenn du über diese Links kaufst, erhalten wir eine Provision ohne zusätzliche Kosten für dich.",
      },
      related: {
        es: "Artículos relacionados",
        en: "Related articles",
        fr: "Articles connexes",
        de: "Verwandte Artikel",
      },
    };
    return translations[key]?.[locale] || translations[key]?.["en"] || key;
  };

  return (
    <div className="max-w-[700px] mx-auto px-6 py-12 animate-fade-up">
      {/* Article header */}
      <div className="label-tag mb-4">{category}</div>
      <h1 className="font-serif text-[clamp(28px,5vw,42px)] font-extralight text-white leading-[1.1] tracking-tight mb-4">
        {article.meta.title}
      </h1>
      <div className="flex items-center gap-4 text-muted text-[11px] mb-6">
        <span>{t("published")} {article.meta.date}</span>
        <span>·</span>
        <span>{article.readingTime} {t("readTime")}</span>
      </div>

      {/* Affiliate disclosure */}
      {article.meta.affiliate && (
        <div className="card accent-left-orange text-[11px] text-muted mb-8">
          {t("disclosure")}
        </div>
      )}

      {/* Article body */}
      <article className="prose-biohack mb-16">
        <MDXRemote source={article.content} components={mdxComponents} />
      </article>

      {/* Newsletter CTA */}
      <div className="mb-16">
        <NewsletterEmbed />
      </div>

      {/* Related articles */}
      {related.length > 0 && (
        <section>
          <h2 className="font-serif text-xl font-light text-white tracking-tight mb-5">
            {t("related")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {related.map((a) => (
              <ArticleCard key={a.slug} article={a} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
