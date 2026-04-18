import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import matter from 'gray-matter';

const CONTENT_ROOT = join(process.cwd(), 'site', 'content');

export interface FrontmatterInput {
  type: 'boe-brief' | 'noticia';
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  pain: string;
  painHook: string;
  tags: string[];
  sources: Array<{
    identificador: string;
    titulo: string;
    url: string;
    departamento: string;
    seccion: string;
  }>;
  aiGenerated: boolean;
  aiModel?: string;
  boeDate?: string;
  itemsCount?: number;
  heroImage?: string;
  heroAlt?: string;
}

function buildMarkdown(frontmatter: FrontmatterInput, body: string): string {
  return matter.stringify(body.trim() + '\n', frontmatter);
}

export async function writeBoeBrief(args: {
  boeDate: string; // YYYY-MM-DD
  frontmatter: FrontmatterInput;
  body: string;
}): Promise<string> {
  const filepath = join(CONTENT_ROOT, 'boe', `${args.boeDate}.md`);
  await mkdir(dirname(filepath), { recursive: true });
  await writeFile(filepath, buildMarkdown(args.frontmatter, args.body));
  return filepath;
}

export async function writeNoticia(args: {
  slug: string;
  frontmatter: FrontmatterInput;
  body: string;
}): Promise<string> {
  const filepath = join(CONTENT_ROOT, 'articulos', `${args.slug}.md`);
  await mkdir(dirname(filepath), { recursive: true });
  await writeFile(filepath, buildMarkdown(args.frontmatter, args.body));
  return filepath;
}
