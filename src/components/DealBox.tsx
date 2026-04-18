interface DealBoxProps {
  title: string;
  description?: string;
  code?: string;
  discount?: string;
  expires?: string;
  url: string;
  store: string;
  cta?: string;
}

export function DealBox({
  title,
  description,
  code,
  discount,
  expires,
  url,
  store,
  cta,
}: DealBoxProps) {
  return (
    <div className="my-10 not-prose relative">
      {/* Diagonal "deal" stripe accent */}
      <div className="absolute -top-3 left-6 bg-bronze text-bg px-3 py-1 text-[10px] tracking-[0.22em] uppercase font-medium">
        Oferta exclusiva
      </div>

      <div className="bg-gradient-to-br from-bronze-tint via-bg to-emerald-tint/40 border border-bronze/30 p-7 md:p-9 pt-10 relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <div className="flex items-baseline gap-3 mb-2">
              {discount && (
                <span className="font-serif text-[42px] font-light text-bronze leading-none">
                  {discount}
                </span>
              )}
              <h4 className="font-serif text-[20px] md:text-[22px] font-normal text-charcoal leading-tight">
                {title}
              </h4>
            </div>
            {description && (
              <p className="text-slate text-[13px] leading-[1.6] mt-2 max-w-[440px]">
                {description}
              </p>
            )}
            {code && (
              <div className="mt-4 flex items-center gap-3">
                <span className="text-stone text-[10px] tracking-[0.18em] uppercase">
                  Código:
                </span>
                <code className="bg-charcoal text-bg px-3 py-1.5 font-mono text-[13px] tracking-[0.1em] border-0">
                  {code}
                </code>
              </div>
            )}
            {expires && (
              <div className="mt-4 text-[11px] text-stone italic font-serif">
                Válido hasta {expires}
              </div>
            )}
          </div>

          <a
            href={url}
            target="_blank"
            rel="nofollow noopener sponsored"
            className="group inline-flex items-center justify-center gap-3 bg-charcoal text-bg px-7 py-4 text-[12px] tracking-wide font-medium hover:bg-bronze transition-colors shrink-0"
          >
            <span>{cta || "Aprovechar oferta"}</span>
            <span className="text-bronze text-[10px] tracking-[0.18em] uppercase border-l border-bronze/40 pl-3">
              {store}
            </span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="group-hover:translate-x-1 transition-transform">
              <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
