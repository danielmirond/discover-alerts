import Link from "next/link";
import type { ArticleMeta } from "@/lib/content";

interface ArticleCardProps {
  article: ArticleMeta;
  locale: string;
  featured?: boolean;
}

export function ArticleCard({ article, locale, featured }: ArticleCardProps) {
  return (
    <Link
      href={article.vertical ? `/${locale}/${article.vertical}/${article.category}/${article.slug}` : `/${locale}/${article.category}/${article.slug}`}
      className={`group card-soft block ${
        featured ? "p-10 md:p-14" : "p-7"
      }`}
    >
      <div className="flex items-center gap-3 mb-5">
        <span className="eyebrow-emerald">{article.category}</span>
        <span className="text-mist">·</span>
        <span className="text-[11px] text-stone">
          {article.readingTime} min
        </span>
      </div>

      <h3
        className={`font-serif font-light text-charcoal tracking-[-0.01em] group-hover:text-emerald transition-colors mb-4 ${
          featured ? "text-[34px] leading-[1.15]" : "text-[20px] leading-[1.3]"
        }`}
      >
        {article.title}
      </h3>

      <p
        className={`text-slate leading-[1.7] ${
          featured ? "text-[15px] line-clamp-3" : "text-[13px] line-clamp-2"
        }`}
      >
        {article.description}
      </p>

      <div className="flex items-center justify-between mt-6 pt-5 border-t border-hairline">
        <span className="text-[11px] text-stone italic font-serif">
          {article.date}
        </span>
        <span className="text-[11px] text-bronze tracking-[0.2em] uppercase">
          Read →
        </span>
      </div>
    </Link>
  );
}
