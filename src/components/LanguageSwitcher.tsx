"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { locales } from "@/i18n/routing";

const flags: Record<string, string> = {
  es: "🇪🇸",
  en: "🇬🇧",
  fr: "🇫🇷",
  de: "🇩🇪",
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
    <div className="flex items-center gap-1">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          className={`px-2 py-1 text-[13px] transition-opacity ${
            l === locale
              ? "opacity-100"
              : "opacity-40 hover:opacity-80"
          }`}
          title={l.toUpperCase()}
        >
          {flags[l]}
        </button>
      ))}
    </div>
  );
}
