import { MetadataRoute } from "next";
import { locales } from "@/i18n/routing";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://biohacklab.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  // Homepage per locale
  for (const locale of locales) {
    entries.push({
      url: `${BASE_URL}/${locale}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, `${BASE_URL}/${l}`])
        ),
      },
    });
  }

  // Article pages
  const contentDir = path.join(process.cwd(), "content");
  if (fs.existsSync(contentDir)) {
    for (const locale of locales) {
      const localeDir = path.join(contentDir, locale);
      if (!fs.existsSync(localeDir)) continue;

      const categories = fs
        .readdirSync(localeDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      for (const category of categories) {
        entries.push({
          url: `${BASE_URL}/${locale}/${category}`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.7,
        });

        const catDir = path.join(localeDir, category);
        const files = fs
          .readdirSync(catDir)
          .filter((f) => f.endsWith(".mdx"));

        for (const file of files) {
          const slug = file.replace(".mdx", "");
          entries.push({
            url: `${BASE_URL}/${locale}/${category}/${slug}`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.8,
          });
        }
      }
    }
  }

  return entries;
}
