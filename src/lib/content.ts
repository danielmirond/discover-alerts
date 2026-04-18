import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";

const contentDir = path.join(process.cwd(), "content");

export interface ArticleMeta {
  slug: string;
  category: string;
  title: string;
  description: string;
  date: string;
  updated?: string;
  affiliate?: boolean;
  readingTime: number;
  alternates?: Record<string, string>;
  stickyCta?: {
    product: string;
    price: string;
    url: string;
    store: string;
    label?: string;
  };
}

interface ArticleFull {
  meta: ArticleMeta;
  content: string;
  readingTime: number;
}

function getCategoryDir(locale: string, category: string): string {
  return path.join(contentDir, locale, category);
}

function parseArticle(
  filePath: string,
  locale: string,
  category: string
): ArticleMeta | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);
    const slug = path.basename(filePath, ".mdx");
    const stats = readingTime(content);

    return {
      slug,
      category,
      title: data.title || slug,
      description: data.description || "",
      date: data.date || "",
      updated: data.updated,
      affiliate: data.affiliate || false,
      readingTime: Math.ceil(stats.minutes),
      alternates: data.alternates,
      stickyCta: data.stickyCta,
    };
  } catch {
    return null;
  }
}

export function getArticlesByLocale(locale: string): ArticleMeta[] {
  const localeDir = path.join(contentDir, locale);
  if (!fs.existsSync(localeDir)) return [];

  const categories = fs
    .readdirSync(localeDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const articles: ArticleMeta[] = [];

  for (const category of categories) {
    const catDir = getCategoryDir(locale, category);
    if (!fs.existsSync(catDir)) continue;

    const files = fs
      .readdirSync(catDir)
      .filter((f) => f.endsWith(".mdx"));

    for (const file of files) {
      const article = parseArticle(
        path.join(catDir, file),
        locale,
        category
      );
      if (article) articles.push(article);
    }
  }

  return articles.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getArticlesByCategory(
  locale: string,
  category: string
): ArticleMeta[] {
  const catDir = getCategoryDir(locale, category);
  if (!fs.existsSync(catDir)) return [];

  const files = fs.readdirSync(catDir).filter((f) => f.endsWith(".mdx"));
  const articles: ArticleMeta[] = [];

  for (const file of files) {
    const article = parseArticle(
      path.join(catDir, file),
      locale,
      category
    );
    if (article) articles.push(article);
  }

  return articles.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getArticle(
  locale: string,
  category: string,
  slug: string
): ArticleFull | null {
  const filePath = path.join(
    getCategoryDir(locale, category),
    `${slug}.mdx`
  );

  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const stats = readingTime(content);

  return {
    meta: {
      slug,
      category,
      title: data.title || slug,
      description: data.description || "",
      date: data.date || "",
      updated: data.updated,
      affiliate: data.affiliate || false,
      readingTime: Math.ceil(stats.minutes),
      alternates: data.alternates,
      stickyCta: data.stickyCta,
    },
    content,
    readingTime: Math.ceil(stats.minutes),
  };
}
