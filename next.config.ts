import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "**.cloudfront.net" },
      { protocol: "https", hostname: "marissacollections.com" },
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "ourahealth.imgix.net" },
      { protocol: "https", hostname: "media.augustinusbader.com" },
      { protocol: "https", hostname: "www.cosrx.com" },
      { protocol: "https", hostname: "cdn-yotpo-images-production.yotpo.com" },
      { protocol: "https", hostname: "**.spermidinelife.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
