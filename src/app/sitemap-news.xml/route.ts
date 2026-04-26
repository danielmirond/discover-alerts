import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { locales } from "@/i18n/routing";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://byaevum.com";

const langMap: Record<string, string> = {
  es: "es",
  en: "en",
  fr: "fr",
  de: "de",
};

interface NewsEntry {
  url: string;
  title: string;
  date: string;
  language: string;
}

function getRecentArticles(): NewsEntry[] {
  const contentDir = path.join(process.cwd(), "content");
  const entries: NewsEntry[] = [];
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  for (const locale of locales) {
    const localeDir = path.join(contentDir, locale);
    if (!fs.existsSync(localeDir)) continue;

    const categories = fs
      .readdirSync(localeDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const category of categories) {
      const catDir = path.join(localeDir, category);
      if (!fs.existsSync(catDir)) continue;

      const files = fs.readdirSync(catDir).filter((f) => f.endsWith(".mdx"));

      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(catDir, file), "utf-8");
          const { data } = matter(raw);
          const pubDate = new Date(data.date);

          if (pubDate >= twoDaysAgo) {
            const slug = file.replace(".mdx", "");
            entries.push({
              url: `${BASE_URL}/${locale}/${category}/${slug}`,
              title: data.title || slug,
              date: pubDate.toISOString(),
              language: langMap[locale] || "es",
            });
          }
        } catch {}
      }
    }
  }

  return entries.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export async function GET() {
  const articles = getRecentArticles();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${articles
  .map(
    (a) => `  <url>
    <loc>${a.url}</loc>
    <news:news>
      <news:publication>
        <news:name>Aevum</news:name>
        <news:language>${a.language}</news:language>
      </news:publication>
      <news:publication_date>${a.date}</news:publication_date>
      <news:title>${escapeXml(a.title)}</news:title>
    </news:news>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
