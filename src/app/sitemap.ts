import { MetadataRoute } from "next";
import { locales } from "@/i18n/routing";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://byaevum.com";

function getArticleDate(filePath: string): Date {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data } = matter(raw);
    const dateStr = data.updated || data.date;
    return dateStr ? new Date(dateStr) : new Date();
  } catch {
    return new Date();
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    entries.push({
      url: `${BASE_URL}/${locale}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, `${BASE_URL}/${l}`])
        ),
      },
    });
  }

  // Static pages
  const staticPages = ["about", "afiliacion", "cookies", "privacidad", "sistema"];
  for (const locale of locales) {
    for (const page of staticPages) {
      entries.push({
        url: `${BASE_URL}/${locale}/${page}`,
        lastModified: new Date("2026-04-25"),
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  }

  // Content pages
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
          const filePath = path.join(catDir, file);
          const lastMod = getArticleDate(filePath);

          entries.push({
            url: `${BASE_URL}/${locale}/${category}/${slug}`,
            lastModified: lastMod,
            changeFrequency: "monthly",
            priority: 0.8,
          });
        }
      }
    }
  }

  return entries;
}
