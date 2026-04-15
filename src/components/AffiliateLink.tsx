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
      className="inline-flex items-center gap-2 bg-accent-green/10 border border-accent-green/30 px-4 py-2 text-accent-green text-[11px] tracking-wide hover:bg-accent-green/20 transition-colors no-underline"
    >
      <span>{children}</span>
      <span className="text-[9px] text-muted">
        {store}
      </span>
    </a>
  );
}
