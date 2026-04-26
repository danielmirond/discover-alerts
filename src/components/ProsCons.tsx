interface ProsConsProps {
  pros: string[];
  cons: string[];
  verdict?: string;
  cta?: {
    label: string;
    url: string;
    store: string;
  };
}

export function ProsCons({ pros, cons, verdict, cta }: ProsConsProps) {
  return (
    <div className="my-12 not-prose">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-line">
        {/* Pros */}
        <div className="bg-emerald-tint/40 p-7">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-emerald text-[20px] leading-none">✓</span>
            <span className="text-emerald text-[11px] tracking-[0.22em] uppercase font-medium">
              Lo mejor
            </span>
          </div>
          <ul className="list-none p-0 m-0 space-y-3">
            {(pros || []).map((pro, i) => (
              <li key={i} className="text-[13.5px] text-charcoal leading-[1.6] pl-5 relative">
                <span className="absolute left-0 top-[8px] w-2 h-px bg-bronze" />
                {pro}
              </li>
            ))}
          </ul>
        </div>

        {/* Cons */}
        <div className="bg-bronze-tint/30 p-7">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-bronze text-[20px] leading-none">✗</span>
            <span className="text-bronze text-[11px] tracking-[0.22em] uppercase font-medium">
              A considerar
            </span>
          </div>
          <ul className="list-none p-0 m-0 space-y-3">
            {(cons || []).map((con, i) => (
              <li key={i} className="text-[13.5px] text-slate leading-[1.6] pl-5 relative">
                <span className="absolute left-0 top-[8px] w-2 h-px bg-bronze" />
                {con}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Verdict + CTA */}
      {(verdict || cta) && (
        <div className="bg-bg border-x border-b border-line p-8 md:p-10 text-center">
          {verdict && (
            <>
              <div className="eyebrow mb-3">Veredicto</div>
              <p className="font-serif italic text-[20px] md:text-[24px] font-light text-charcoal leading-[1.4] tracking-[-0.005em] max-w-[640px] mx-auto mb-6">
                &ldquo;{verdict}&rdquo;
              </p>
            </>
          )}
          {cta && (
            <a
              href={cta.url}
              target="_blank"
              rel="nofollow noopener sponsored"
              className="group inline-flex items-center gap-3 bg-charcoal text-bg px-8 py-4 text-[13px] tracking-wide font-medium hover:bg-bronze transition-colors"
            >
              <span>{cta.label}</span>
              <span className="text-bronze text-[10px] tracking-[0.18em] uppercase border-l border-bronze/40 pl-3">
                {cta.store}
              </span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="group-hover:translate-x-1 transition-transform">
                <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
              </svg>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
