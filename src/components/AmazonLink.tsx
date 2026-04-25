import { getLocale } from "next-intl/server";

type Locale = "es" | "en" | "fr" | "de";

const domainByLocale: Record<Locale, string> = {
  es: "amazon.es",
  en: "amazon.com",
  fr: "amazon.fr",
  de: "amazon.de",
};

const storeLabel: Record<Locale, string> = {
  es: "Amazon.es",
  en: "Amazon",
  fr: "Amazon.fr",
  de: "Amazon.de",
};

function getTagForLocale(locale: Locale): string {
  const envKey = `NEXT_PUBLIC_AMAZON_TAG_${locale.toUpperCase()}`;
  return process.env[envKey] || "nuus-21";
}

interface AmazonLinkProps {
  asin: string;
  children: React.ReactNode;
  variant?: "inline" | "button";
  className?: string;
}

/**
 * Server Component that generates Amazon affiliate links
 * automatically adjusted by user locale + tag.
 *
 * Usage in MDX:
 *   <AmazonLink asin="B0CYL5XGHR">Comprar Oura Ring</AmazonLink>
 */
export async function AmazonLink({
  asin,
  children,
  variant = "button",
  className,
}: AmazonLinkProps) {
  const locale = (await getLocale()) as Locale;
  const domain = domainByLocale[locale] || "amazon.com";
  const tag = getTagForLocale(locale);
  const store = storeLabel[locale];

  const url = `https://www.${domain}/dp/${asin}?tag=${tag}`;

  if (variant === "inline") {
    return (
      <a
        href={url}
        target="_blank"
        rel="nofollow noopener sponsored"
        className={
          className ||
          "text-emerald underline decoration-emerald/30 underline-offset-[3px] hover:decoration-emerald transition-all"
        }
      >
        {children}
      </a>
    );
  }

  return (
    <a
      href={url}
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
        <path
          d="M5 3L9 7L5 11"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="square"
        />
      </svg>
    </a>
  );
}
