interface ExpertQuoteProps {
  quote: string;
  author: string;
  role: string;
  org?: string;
  source?: string;
}

export function ExpertQuote({ quote, author, role, org, source }: ExpertQuoteProps) {
  return (
    <figure className="my-10 bg-ivory border border-hairline p-8 md:p-10 relative">
      <div className="absolute top-6 right-8 font-serif italic text-[64px] text-bronze/15 leading-none select-none">
        &ldquo;
      </div>

      <blockquote className="font-serif text-[20px] md:text-[24px] font-light text-charcoal italic leading-[1.45] tracking-[-0.005em] mb-6 relative z-10 max-w-[580px]">
        &ldquo;{quote}&rdquo;
      </blockquote>

      <figcaption className="flex items-center gap-4">
        <div className="w-10 h-10 bg-emerald/10 border border-emerald/20 flex items-center justify-center shrink-0">
          <span className="font-serif text-emerald text-[16px] font-normal">
            {author.charAt(0)}
          </span>
        </div>
        <div>
          <div className="text-[13px] text-charcoal font-medium">
            {source ? (
              <a href={source} target="_blank" rel="noopener noreferrer" className="hover:text-emerald transition-colors">
                {author}
                <span className="text-[10px] text-bronze ml-1">↗</span>
              </a>
            ) : author}
          </div>
          <div className="text-[11px] text-stone">
            {role}
            {org && <span className="text-bronze"> · {org}</span>}
          </div>
        </div>
      </figcaption>
    </figure>
  );
}
