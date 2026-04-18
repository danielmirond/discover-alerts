import Image from "next/image";

interface ProductCTA {
  label: string;
  url: string;
  store: string;
  primary?: boolean;
}

interface ProductCardProps {
  name: string;
  category?: string;
  badge?: string;
  description: string;
  rating: number;
  testedFor?: string;
  specs?: { label: string; value: string }[];
  price: string;
  priceContext?: string;
  ctas: ProductCTA[];
  image?: string;
  emoji?: string;
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <div className="flex items-center gap-2">
      <span className="text-bronze tracking-tight text-[15px] leading-none">
        {"★".repeat(full)}
        {half && "✬"}
        <span className="text-bronze/25">{"★".repeat(empty)}</span>
      </span>
      <span className="text-charcoal text-[13px] font-medium">
        {rating.toFixed(1)}
      </span>
      <span className="text-stone text-[11px]">/ 5</span>
    </div>
  );
}

export function ProductCard({
  name,
  category,
  badge,
  description,
  rating,
  testedFor,
  specs,
  price,
  priceContext,
  ctas,
  image,
  emoji,
}: ProductCardProps) {
  return (
    <div className="my-10 bg-bg border border-line shadow-[0_4px_32px_rgba(10,77,60,0.06)] overflow-hidden">
      {/* Top: visual area + badge */}
      <div className="relative border-b border-hairline overflow-hidden">
        {badge && (
          <div className="absolute top-5 right-5 z-10 bg-charcoal text-bg px-3 py-1 text-[10px] tracking-[0.18em] uppercase font-medium">
            {badge}
          </div>
        )}
        {image ? (
          <div className="relative h-64 md:h-80">
            <Image
              src={image}
              alt={name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg/30 via-transparent to-transparent" />
          </div>
        ) : (
          <div className="bg-gradient-to-br from-ivory via-bg to-bronze-tint/30 p-10">
            <div className="flex items-center justify-center h-32 text-[80px] leading-none font-serif text-bronze/30 select-none">
              {emoji || name.charAt(0)}
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-8 md:p-10">
        {category && (
          <div className="eyebrow mb-2">{category}</div>
        )}
        <h3 className="font-serif text-[26px] md:text-[30px] font-light text-charcoal tracking-[-0.01em] mb-3 leading-tight">
          {name}
        </h3>
        <p className="text-slate text-[14px] leading-[1.7] mb-5 max-w-[480px]">
          {description}
        </p>

        <div className="flex items-center gap-5 mb-7 flex-wrap">
          <StarRating rating={rating} />
          {testedFor && (
            <>
              <span className="w-px h-4 bg-line" />
              <span className="text-stone text-[11px] tracking-[0.12em] uppercase">
                {testedFor}
              </span>
            </>
          )}
        </div>

        {/* Specs grid */}
        {specs && specs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mb-8 pb-8 border-b border-hairline">
            {specs.map((spec, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3">
                <span className="text-stone text-[11px] tracking-[0.1em] uppercase shrink-0">
                  {spec.label}
                </span>
                <span className="text-charcoal text-[13px] text-right">
                  {spec.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Price + CTAs */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-stone mb-1">
              Desde
            </div>
            <div className="font-serif text-[36px] font-light text-charcoal leading-none">
              {price}
            </div>
            {priceContext && (
              <div className="text-stone text-[11px] mt-1 italic font-serif">
                {priceContext}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {ctas.map((cta, i) => (
              <a
                key={i}
                href={cta.url}
                target="_blank"
                rel="nofollow noopener sponsored"
                className={`group inline-flex items-center justify-center gap-3 px-6 py-3.5 text-[12px] tracking-wide font-medium transition-colors ${
                  cta.primary !== false && i === 0
                    ? "bg-charcoal text-bg hover:bg-charcoal"
                    : "border border-line text-charcoal hover:border-charcoal hover:text-charcoal"
                }`}
              >
                <span>{cta.label}</span>
                <span
                  className={`text-[10px] tracking-[0.18em] uppercase border-l pl-3 ${
                    cta.primary !== false && i === 0
                      ? "border-bronze/40 text-bronze"
                      : "border-line text-stone"
                  }`}
                >
                  {cta.store}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="group-hover:translate-x-0.5 transition-transform">
                  <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
