"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

export function NewsletterEmbed() {
  const t = useTranslations("newsletter");
  const [email, setEmail] = useState("");

  return (
    <div className="bg-ivory border border-hairline p-12 md:p-16 relative overflow-hidden">
      <div className="absolute top-8 right-8 eyebrow">Newsletter</div>

      <div className="max-w-[540px]">
        <h3 className="display-md mb-5">{t("title")}</h3>
        <p className="text-slate text-[15px] leading-[1.7] mb-8">
          {t("description")}
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            window.open(
              `https://aevum.beehiiv.com/subscribe?email=${encodeURIComponent(email)}`,
              "_blank"
            );
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("placeholder")}
            required
            className="flex-1 bg-bg border border-line px-5 py-3.5 text-[14px] text-charcoal placeholder:text-mist outline-none focus:border-emerald transition-colors"
          />
          <button type="submit" className="btn-primary justify-center">
            {t("subscribe")}
          </button>
        </form>

        <div className="ornament mt-10 text-[10px] tracking-[0.25em] uppercase">
          <span>
            {t("premiumTitle")} · {t("premiumPrice")}
          </span>
        </div>
        <p className="text-center text-stone text-[13px] mt-3 italic font-serif">
          {t("premiumDesc")}
        </p>
      </div>
    </div>
  );
}
