import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";

const contentDir = path.join(process.cwd(), "content");

export interface ArticleMeta {
  slug: string;
  category: string;
  vertical?: string;
  title: string;
  description: string;
  date: string;
  updated?: string;
  affiliate?: boolean;
  readingTime: number;
  alternates?: Record<string, string>;
  heroImage?: string;
  heroCredit?: string;
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

function getCategoryDir(locale: string, category: string, vertical?: string): string {
  if (vertical) {
    return path.join(contentDir, locale, vertical, category);
  }
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
      heroImage: data.heroImage,
      heroCredit: data.heroCredit,
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

  const VERTICALS = ["hara"];

  for (const category of categories) {
    if (VERTICALS.includes(category)) {
      const verticalDir = path.join(contentDir, locale, category);
      if (!fs.existsSync(verticalDir)) continue;
      const subCategories = fs
        .readdirSync(verticalDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
      for (const subCat of subCategories) {
        const subDir = path.join(verticalDir, subCat);
        const files = fs.readdirSync(subDir).filter((f) => f.endsWith(".mdx"));
        for (const file of files) {
          const article = parseArticle(path.join(subDir, file), locale, subCat);
          if (article) {
            article.vertical = category;
            articles.push(article);
          }
        }
      }
      continue;
    }

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
      heroImage: data.heroImage,
      heroCredit: data.heroCredit,
      stickyCta: data.stickyCta,
    },
    content,
    readingTime: Math.ceil(stats.minutes),
  };
}

export function getHaraArticlesByCategory(
  locale: string,
  category: string
): ArticleMeta[] {
  const catDir = getCategoryDir(locale, category, "hara");
  if (!fs.existsSync(catDir)) return [];

  const files = fs.readdirSync(catDir).filter((f) => f.endsWith(".mdx"));
  const articles: ArticleMeta[] = [];

  for (const file of files) {
    const article = parseArticle(path.join(catDir, file), locale, category);
    if (article) {
      article.vertical = "hara";
      articles.push(article);
    }
  }

  return articles.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getHaraAllArticles(locale: string): ArticleMeta[] {
  const haraDir = path.join(contentDir, locale, "hara");
  if (!fs.existsSync(haraDir)) return [];

  const subCategories = fs
    .readdirSync(haraDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const articles: ArticleMeta[] = [];
  for (const subCat of subCategories) {
    articles.push(...getHaraArticlesByCategory(locale, subCat));
  }

  return articles.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getHaraArticle(
  locale: string,
  category: string,
  slug: string
): ArticleFull | null {
  const filePath = path.join(
    getCategoryDir(locale, category, "hara"),
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
      vertical: "hara",
      title: data.title || slug,
      description: data.description || "",
      date: data.date || "",
      updated: data.updated,
      affiliate: data.affiliate || false,
      readingTime: Math.ceil(stats.minutes),
      alternates: data.alternates,
      heroImage: data.heroImage,
      heroCredit: data.heroCredit,
      stickyCta: data.stickyCta,
    },
    content,
    readingTime: Math.ceil(stats.minutes),
  };
}
