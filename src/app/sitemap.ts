import { MetadataRoute } from "next";
import { locales } from "@/i18n/routing";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

interface ArticleMeta {
  date?: string;
  updated?: string;
  alternates?: Record<string, string>;
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://byaevum.com";

function getArticleMeta(filePath: string): { date: Date; alternates?: Record<string, string> } {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data } = matter(raw) as { data: ArticleMeta };
    const dateStr = data.updated || data.date;
    return {
      date: dateStr ? new Date(dateStr) : new Date(),
      alternates: data.alternates,
    };
  } catch {
    return { date: new Date() };
  }
}

function buildAlternates(alternates?: Record<string, string>, isHara = false) {
  if (!alternates) return undefined;
  const prefix = isHara ? "/hara/" : "/";
  return {
    languages: Object.fromEntries(
      Object.entries(alternates)
        .filter(([l]) => (locales as readonly string[]).includes(l))
        .map(([l, path]) => [l, `${BASE_URL}/${l}${isHara ? "/hara/" : "/"}${path}`])
    ),
  };
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

      const VERTICALS = ["hara"];

      for (const category of categories) {
        const catDir = path.join(localeDir, category);

        if (VERTICALS.includes(category)) {
          entries.push({
            url: `${BASE_URL}/${locale}/${category}`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.7,
          });
          const subCats = fs.readdirSync(catDir, { withFileTypes: true })
            .filter((d) => d.isDirectory()).map((d) => d.name);
          for (const subCat of subCats) {
            entries.push({
              url: `${BASE_URL}/${locale}/${category}/${subCat}`,
              lastModified: new Date(),
              changeFrequency: "weekly",
              priority: 0.7,
            });
            const subDir = path.join(catDir, subCat);
            const files = fs.readdirSync(subDir).filter((f) => f.endsWith(".mdx"));
            for (const file of files) {
              const slug = file.replace(".mdx", "");
              const meta = getArticleMeta(path.join(subDir, file));
              entries.push({
                url: `${BASE_URL}/${locale}/${category}/${subCat}/${slug}`,
                lastModified: meta.date,
                changeFrequency: "monthly",
                priority: 0.8,
                alternates: buildAlternates(meta.alternates, true),
              });
            }
          }
          continue;
        }

        entries.push({
          url: `${BASE_URL}/${locale}/${category}`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.7,
        });

        const files = fs
          .readdirSync(catDir)
          .filter((f) => f.endsWith(".mdx"));

        for (const file of files) {
          const slug = file.replace(".mdx", "");
          const filePath = path.join(catDir, file);
          const meta = getArticleMeta(filePath);

          entries.push({
            url: `${BASE_URL}/${locale}/${category}/${slug}`,
            lastModified: meta.date,
            changeFrequency: "monthly",
            priority: 0.8,
            alternates: buildAlternates(meta.alternates),
          });
        }
      }
    }
  }

  return entries;
}
