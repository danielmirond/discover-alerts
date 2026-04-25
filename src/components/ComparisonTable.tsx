interface ComparisonProduct {
  name: string;
  emoji?: string;
  badge?: string;
  attributes: Record<string, string>;
  rating?: number;
  price: string;
  ctaUrl: string;
  ctaStore: string;
}

interface ComparisonTableProps {
  products: ComparisonProduct[];
  attributes: string[];
  title?: string;
}

export function ComparisonTable({
  products,
  attributes,
  title,
}: ComparisonTableProps) {
  return (
    <div className="my-12 not-prose">
      {title && (
        <div className="mb-6">
          <div className="eyebrow mb-2">Comparativa</div>
          <h3 className="display-md">{title}</h3>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block bg-bg border border-line overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-ivory">
              <th className="text-left p-5 text-[10px] tracking-[0.2em] uppercase text-stone font-medium border-b border-line w-[160px]">
                {/* empty */}
              </th>
              {(products || []).map((p, i) => (
                <th
                  key={i}
                  className="text-center p-5 border-b border-line border-l border-l-line align-top"
                >
                  <div className="text-[44px] leading-none font-serif text-bronze/30 mb-2">
                    {p.emoji || p.name.charAt(0)}
                  </div>
                  {p.badge && (
                    <div className="inline-block bg-charcoal/10 text-charcoal text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 mb-2">
                      {p.badge}
                    </div>
                  )}
                  <div className="font-serif text-[18px] font-normal text-charcoal leading-tight">
                    {p.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(attributes || []).map((attr) => (
              <tr key={attr} className="hover:bg-pearl/50">
                <td className="p-4 text-[11px] tracking-[0.12em] uppercase text-stone border-b border-hairline">
                  {attr}
                </td>
                {(products || []).map((p, i) => (
                  <td
                    key={i}
                    className="p-4 text-[13px] text-charcoal text-center border-b border-hairline border-l border-l-line"
                  >
                    {p.attributes[attr] || "—"}
                  </td>
                ))}
              </tr>
            ))}
            {/* Price row */}
            <tr className="bg-bronze-tint/30">
              <td className="p-4 text-[11px] tracking-[0.12em] uppercase text-bronze font-medium border-b border-hairline">
                Precio
              </td>
              {(products || []).map((p, i) => (
                <td
                  key={i}
                  className="p-4 text-center border-b border-hairline border-l border-l-line"
                >
                  <div className="font-serif text-[20px] font-light text-charcoal">
                    {p.price}
                  </div>
                </td>
              ))}
            </tr>
            {/* CTA row */}
            <tr>
              <td className="p-4" />
              {(products || []).map((p, i) => (
                <td
                  key={i}
                  className="p-4 text-center border-l border-l-line"
                >
                  <a
                    href={p.ctaUrl}
                    target="_blank"
                    rel="nofollow noopener sponsored"
                    className="inline-flex items-center gap-2 bg-charcoal text-bg px-4 py-2.5 text-[11px] tracking-wide font-medium hover:bg-bronze transition-colors"
                  >
                    <span>Ver en {p.ctaStore}</span>
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                    </svg>
                  </a>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <div className="md:hidden grid gap-4">
        {(products || []).map((p, i) => (
          <div key={i} className="bg-bg border border-line p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="text-[40px] leading-none font-serif text-bronze/30">
                {p.emoji || p.name.charAt(0)}
              </div>
              <div className="flex-1">
                {p.badge && (
                  <div className="inline-block bg-charcoal/10 text-charcoal text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 mb-1">
                    {p.badge}
                  </div>
                )}
                <div className="font-serif text-[18px] text-charcoal">
                  {p.name}
                </div>
                <div className="font-serif text-[20px] font-light text-charcoal mt-1">
                  {p.price}
                </div>
              </div>
            </div>
            <div className="space-y-2 mb-5 text-[13px]">
              {(attributes || []).map((attr) => (
                <div key={attr} className="flex justify-between border-b border-hairline pb-2">
                  <span className="text-stone text-[11px] tracking-[0.1em] uppercase">{attr}</span>
                  <span className="text-charcoal text-right">{p.attributes[attr] || "—"}</span>
                </div>
              ))}
            </div>
            <a
              href={p.ctaUrl}
              target="_blank"
              rel="nofollow noopener sponsored"
              className="flex items-center justify-center gap-2 bg-charcoal text-bg w-full px-4 py-3 text-[12px] tracking-wide font-medium"
            >
              <span>Ver en {p.ctaStore}</span>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
              </svg>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
