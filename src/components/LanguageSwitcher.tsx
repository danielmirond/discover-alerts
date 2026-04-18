"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { locales } from "@/i18n/routing";

const labels: Record<string, string> = {
  es: "ES",
  en: "EN",
  fr: "FR",
  de: "DE",
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(newLocale: string) {
    const segments = pathname.split("/");
    segments[1] = newLocale;
    router.push(segments.join("/"));
  }

  return (
    <div className="flex items-center border border-line rounded-full overflow-hidden">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          className={`px-3 py-1.5 text-[10px] tracking-[0.1em] font-medium transition-colors ${
            l === locale
              ? "bg-charcoal text-bg"
              : "text-stone hover:text-emerald"
          }`}
        >
          {labels[l]}
        </button>
      ))}
    </div>
  );
}
