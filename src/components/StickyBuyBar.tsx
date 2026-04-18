"use client";

import { useEffect, useState } from "react";

interface StickyBuyBarProps {
  product: string;
  price: string;
  url: string;
  store: string;
  cta?: string;
}

export function StickyBuyBar({
  product,
  price,
  url,
  store,
  cta,
}: StickyBuyBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      // Show after user has scrolled past 600px
      const shouldShow = window.scrollY > 600;
      // Hide near the bottom (so it doesn't overlap final CTA)
      const nearBottom =
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 200;
      setVisible(shouldShow && !nearBottom);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 md:hidden bg-bg border-t border-line shadow-[0_-4px_24px_rgba(10,77,60,0.08)] transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      role="complementary"
      aria-label="Quick purchase bar"
    >
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] tracking-[0.15em] uppercase text-stone leading-tight">
            {store}
          </div>
          <div className="font-serif text-[14px] text-charcoal truncate leading-tight">
            {product}
          </div>
          <div className="text-[12px] text-bronze font-medium leading-tight mt-0.5">
            {price}
          </div>
        </div>
        <a
          href={url}
          target="_blank"
          rel="nofollow noopener sponsored"
          className="bg-emerald text-bg px-5 py-3 text-[12px] tracking-wide font-medium whitespace-nowrap shrink-0"
        >
          {cta || "Comprar →"}
        </a>
      </div>
    </div>
  );
}
