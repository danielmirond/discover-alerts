import Link from "next/link";
import type { ArticleMeta } from "@/lib/content";

interface ArticleCardProps {
  article: ArticleMeta;
  locale: string;
}

export function ArticleCard({ article, locale }: ArticleCardProps) {
  return (
    <Link
      href={`/${locale}/${article.category}/${article.slug}`}
      className="card hover:bg-s2 transition-colors group block"
    >
      <div className="text-[9px] tracking-[0.15em] uppercase text-accent-blue mb-2">
        {article.category}
      </div>
      <h3 className="font-serif text-[15px] font-normal text-white mb-2 group-hover:text-accent-blue transition-colors">
        {article.title}
      </h3>
      <p className="text-muted text-[11px] line-clamp-2 mb-3">
        {article.description}
      </p>
      <div className="flex items-center gap-3 text-[10px] text-muted">
        <span>{article.date}</span>
        <span>·</span>
        <span>{article.readingTime} min</span>
      </div>
    </Link>
  );
}
