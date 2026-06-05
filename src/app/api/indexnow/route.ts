import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { locales } from "@/i18n/routing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://byaevum.com";
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "aevum2026indexnow";
const VERTICALS = ["hara"];

function getAllUrls(): string[] {
  const urls: string[] = [];
  const contentDir = path.join(process.cwd(), "content");

  for (const locale of locales) {
    urls.push(`${SITE_URL}/${locale}`);

    const localeDir = path.join(contentDir, locale);
    if (!fs.existsSync(localeDir)) continue;

    const categories = fs
      .readdirSync(localeDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const category of categories) {
      const catDir = path.join(localeDir, category);
      urls.push(`${SITE_URL}/${locale}/${category}`);

      if (VERTICALS.includes(category)) {
        const subCats = fs
          .readdirSync(catDir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name);

        for (const subCat of subCats) {
          urls.push(`${SITE_URL}/${locale}/${category}/${subCat}`);
          const subDir = path.join(catDir, subCat);
          const files = fs.readdirSync(subDir).filter((f) => f.endsWith(".mdx"));
          for (const file of files) {
            const slug = file.replace(".mdx", "");
            urls.push(`${SITE_URL}/${locale}/${category}/${subCat}/${slug}`);
          }
        }
        continue;
      }

      const files = fs.readdirSync(catDir).filter((f) => f.endsWith(".mdx"));
      for (const file of files) {
        const slug = file.replace(".mdx", "");
        urls.push(`${SITE_URL}/${locale}/${category}/${slug}`);
      }
    }
  }

  return urls;
}

function getRecentUrls(days: number = 7): string[] {
  const urls: string[] = [];
  const contentDir = path.join(process.cwd(), "content");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  for (const locale of locales) {
    const localeDir = path.join(contentDir, locale);
    if (!fs.existsSync(localeDir)) continue;

    const categories = fs
      .readdirSync(localeDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const category of categories) {
      const catDir = path.join(localeDir, category);

      if (VERTICALS.includes(category)) {
        const subCats = fs
          .readdirSync(catDir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name);
        for (const subCat of subCats) {
          const subDir = path.join(catDir, subCat);
          const files = fs.readdirSync(subDir).filter((f) => f.endsWith(".mdx"));
          for (const file of files) {
            try {
              const raw = fs.readFileSync(path.join(subDir, file), "utf-8");
              const { data } = matter(raw);
              if (new Date(data.date) >= cutoff) {
                urls.push(`${SITE_URL}/${locale}/${category}/${subCat}/${file.replace(".mdx", "")}`);
              }
            } catch {}
          }
        }
        continue;
      }

      const files = fs.readdirSync(catDir).filter((f) => f.endsWith(".mdx"));
      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(catDir, file), "utf-8");
          const { data } = matter(raw);
          if (new Date(data.date) >= cutoff) {
            urls.push(`${SITE_URL}/${locale}/${category}/${file.replace(".mdx", "")}`);
          }
        } catch {}
      }
    }
  }

  return urls;
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "recent";
  const days = parseInt(searchParams.get("days") || "7");

  const urls = mode === "all" ? getAllUrls() : getRecentUrls(days);

  if (urls.length === 0) {
    return NextResponse.json({ message: "No URLs to submit", count: 0 });
  }

  const batch = urls.slice(0, 10000);

  const payload = {
    host: new URL(SITE_URL).hostname,
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: batch,
  };

  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return NextResponse.json({
      status: response.status,
      message: response.status === 200 ? "Submitted successfully" : "Submitted (check status)",
      count: batch.length,
      urls: batch.slice(0, 10),
      mode,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to submit to IndexNow", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  const recent = getRecentUrls(7);
  const all = getAllUrls();
  return NextResponse.json({
    totalUrls: all.length,
    recentUrls: recent.length,
    key: INDEXNOW_KEY,
    usage: "POST /api/indexnow?mode=recent&days=7 or POST /api/indexnow?mode=all",
  });
}
