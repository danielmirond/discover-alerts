// Content layer: lee markdown de /content, parsea frontmatter,
// renderiza a HTML. Todo sincronico para que funcione con SSG.

import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import type { Article, ArticleFrontmatter, ArticleType } from './types.js';

const CONTENT_DIR = join(process.cwd(), 'content');

function wordsPerMinute(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    const s = await stat(full);
    if (s.isDirectory()) {
      out.push(...(await walk(full)));
    } else if (name.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

async function loadOne(filepath: string): Promise<Article> {
  const raw = await readFile(filepath, 'utf-8');
  const parsed = matter(raw);
  const frontmatter = parsed.data as ArticleFrontmatter;
  const body = parsed.content;
  const html = await marked.parse(body, { async: true });
  return {
    frontmatter,
    body,
    html,
    readingMinutes: wordsPerMinute(body),
  };
}

export async function loadAllArticles(): Promise<Article[]> {
  const files = await walk(CONTENT_DIR);
  const articles = await Promise.all(files.map(loadOne));
  // Mas nuevos primero
  articles.sort(
    (a, b) =>
      new Date(b.frontmatter.date).getTime() -
      new Date(a.frontmatter.date).getTime(),
  );
  return articles;
}

export async function loadArticlesByType(type: ArticleType): Promise<Article[]> {
  const all = await loadAllArticles();
  return all.filter(a => a.frontmatter.type === type);
}

export async function loadArticleBySlug(slug: string): Promise<Article | null> {
  const all = await loadAllArticles();
  return all.find(a => a.frontmatter.slug === slug) ?? null;
}

export async function loadBoeBriefByDate(
  boeDate: string,
): Promise<Article | null> {
  const all = await loadArticlesByType('boe-brief');
  return all.find(a => a.frontmatter.boeDate === boeDate) ?? null;
}
