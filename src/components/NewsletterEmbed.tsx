"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

export function NewsletterEmbed() {
  const t = useTranslations("newsletter");
  const [email, setEmail] = useState("");

  return (
    <div className="bg-gradient-to-br from-accent-blue/5 to-accent-green/3 border border-accent-blue/20 p-7">
      <h3 className="font-serif text-lg font-light text-accent-blue mb-2">
        {t("title")}
      </h3>
      <p className="text-muted text-[12px] mb-5 max-w-[480px]">
        {t("description")}
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          // Beehiiv integration: replace with actual embed URL
          window.open(
            `https://biohacklab.beehiiv.com/subscribe?email=${encodeURIComponent(email)}`,
            "_blank"
          );
        }}
        className="flex gap-2 max-w-[420px]"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("placeholder")}
          required
          className="flex-1 bg-s1 border border-border px-4 py-2.5 text-[12px] text-text placeholder:text-muted/50 outline-none focus:border-accent-blue/50 transition-colors"
        />
        <button
          type="submit"
          className="bg-accent-blue/10 border border-accent-blue/30 px-5 py-2.5 text-accent-blue text-[10px] tracking-[0.15em] uppercase hover:bg-accent-blue/20 transition-colors shrink-0"
        >
          {t("subscribe")}
        </button>
      </form>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-[10px] text-muted">
          {t("premiumTitle")} — {t("premiumPrice")}
        </span>
        <span className="text-[10px] text-muted/50">·</span>
        <span className="text-[10px] text-muted/80">{t("premiumDesc")}</span>
      </div>
    </div>
  );
}
