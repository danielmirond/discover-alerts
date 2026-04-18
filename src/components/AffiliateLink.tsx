import { ReactNode } from "react";

interface AffiliateLinkProps {
  href: string;
  store?: string;
  children: ReactNode;
}

export function AffiliateLink({
  href,
  store = "Amazon",
  children,
}: AffiliateLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="nofollow noopener sponsored"
      className="inline-flex items-center gap-3 group no-underline my-6 bg-charcoal hover:bg-bronze transition-colors px-7 py-4"
    >
      <span className="text-bg text-[13px] tracking-wide font-medium">
        {children}
      </span>
      <span className="text-bronze/80 text-[10px] tracking-[0.2em] uppercase border-l border-bronze/30 pl-3">
        {store}
      </span>
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        className="text-bg group-hover:translate-x-0.5 transition-transform"
      >
        <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      </svg>
    </a>
  );
}
