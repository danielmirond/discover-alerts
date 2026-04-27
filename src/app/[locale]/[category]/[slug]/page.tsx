import { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { getArticle, getArticlesByCategory } from "@/lib/content";
import { locales } from "@/i18n/routing";
import { NewsletterEmbed } from "@/components/NewsletterEmbed";
import { AffiliateLink } from "@/components/AffiliateLink";
import { ArticleCard } from "@/components/ArticleCard";
import { EvidenceBadge } from "@/components/EvidenceBadge";
import { Sources } from "@/components/Sources";
import { ExpertQuote } from "@/components/ExpertQuote";
import { ProductCard } from "@/components/ProductCard";
import { ComparisonTable } from "@/components/ComparisonTable";
import { ProsCons } from "@/components/ProsCons";
import { DealBox } from "@/components/DealBox";
import { StickyBuyBar } from "@/components/StickyBuyBar";
import { AmazonLink } from "@/components/AmazonLink";
import { ArticleHero } from "@/components/ArticleHero";

const mdxComponents = {
  AffiliateLink,
  NewsletterEmbed,
  EvidenceBadge,
  Sources,
  ExpertQuote,
  ProductCard,
  ComparisonTable,
  ProsCons,
  DealBox,
  AmazonLink,
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
    .slice(0, 3);

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
        es: "Continúa leyendo",
        en: "Continue reading",
        fr: "Continuer la lecture",
        de: "Weiterlesen",
      },
    };
    return translations[key]?.[locale] || translations[key]?.["en"] || key;
  };

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://byaevum.com";
  const articleUrl = `${SITE_URL}/${locale}/${category}/${slug}`;

  const jsonLdArticle = {
    "@context": "https://schema.org",
    "@type": article.meta.affiliate ? "Review" : "Article",
    headline: article.meta.title,
    description: article.meta.description,
    image: article.meta.heroImage || `${SITE_URL}/opengraph-image`,
    datePublished: article.meta.date,
    dateModified: article.meta.updated || article.meta.date,
    url: articleUrl,
    inLanguage: locale,
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
    publisher: {
      "@type": "Organization",
      name: "Aevum",
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/favicon.svg` },
    },
    author: {
      "@type": "Organization",
      name: "Aevum Editorial",
      url: `${SITE_URL}/${locale}/about`,
    },
    ...(article.meta.affiliate && article.meta.stickyCta ? {
      itemReviewed: {
        "@type": "Product",
        name: article.meta.stickyCta.product,
        offers: {
          "@type": "Offer",
          price: article.meta.stickyCta.price.replace(/[^0-9.,]/g, ""),
          priceCurrency: "EUR",
          url: article.meta.stickyCta.url,
          availability: "https://schema.org/InStock",
        },
      },
    } : {}),
    wordCount: article.content.split(/\s+/).length,
    timeRequired: `PT${article.readingTime}M`,
  };

  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Aevum", item: `${SITE_URL}/${locale}` },
      { "@type": "ListItem", position: 2, name: category, item: `${SITE_URL}/${locale}/${category}` },
      { "@type": "ListItem", position: 3, name: article.meta.title, item: articleUrl },
    ],
  };

  return (
    <article className="animate-fade-up">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />
      {/* HERO IMAGE */}
      {article.meta.heroImage && (
        <ArticleHero
          src={article.meta.heroImage}
          alt={article.meta.title}
          credit={article.meta.heroCredit}
        />
      )}

      {/* HEADER */}
      <header className={`max-w-[780px] mx-auto px-8 ${article.meta.heroImage ? "pt-12" : "pt-20"} pb-16 text-center`}>
        <div className="eyebrow mb-6">{category}</div>
        <h1 className="display-lg mb-8">
          {article.meta.title}
        </h1>
        <p className="font-serif italic text-[18px] text-stone font-light max-w-[580px] mx-auto leading-[1.5]">
          {article.meta.description}
        </p>

        <div className="flex items-center justify-center gap-5 mt-10 text-[11px] text-stone tracking-[0.15em] uppercase">
          <span>{t("published")} · {article.meta.date}</span>
          <span className="w-6 h-px bg-bronze" />
          <span>{article.readingTime} {t("readTime")}</span>
        </div>
      </header>

      {/* DIVIDER */}
      <div className="max-w-[640px] mx-auto px-8">
        <div className="ornament text-[10px] tracking-[0.3em] uppercase max-w-[300px] mx-auto" />
      </div>

      {/* AFFILIATE DISCLOSURE */}
      {article.meta.affiliate && (
        <div className="max-w-[640px] mx-auto px-8 mt-12">
          <div className="bg-bronze/5 border-l-2 border-bronze p-5 text-[12px] text-stone leading-[1.7] italic">
            {t("disclosure")}
          </div>
        </div>
      )}

      {/* BODY */}
      <div className="max-w-[640px] mx-auto px-8 py-16">
        <div className="prose-editorial">
          <MDXRemote source={article.content} components={mdxComponents} options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }} />
        </div>
      </div>

      {/* NEWSLETTER */}
      <section className="max-w-[1200px] mx-auto px-8 py-16">
        <NewsletterEmbed />
      </section>

      {/* RELATED */}
      {related.length > 0 && (
        <section className="bg-pearl py-24 px-8 mt-12">
          <div className="max-w-[1200px] mx-auto">
            <div className="eyebrow mb-3">Further reading</div>
            <h2 className="display-md mb-10">{t("related")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
              {related.map((a) => (
                <div key={a.slug} className="bg-bg">
                  <ArticleCard article={a} locale={locale} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* STICKY BUY BAR (mobile) */}
      {article.meta.stickyCta && (
        <StickyBuyBar
          product={article.meta.stickyCta.product}
          price={article.meta.stickyCta.price}
          url={article.meta.stickyCta.url}
          store={article.meta.stickyCta.store}
          cta={article.meta.stickyCta.label}
        />
      )}
    </article>
  );
}
