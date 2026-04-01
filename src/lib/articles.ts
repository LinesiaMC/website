import fs from "fs";
import path from "path";

const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = IS_VERCEL ? "/tmp" : path.join(process.cwd(), "data");
const ARTICLES_FILE = path.join(DATA_DIR, "articles.json");

// On Vercel, seed from bundled data if available
if (IS_VERCEL && !fs.existsSync(ARTICLES_FILE)) {
  const bundled = path.join(process.cwd(), "data", "articles.json");
  if (fs.existsSync(bundled)) {
    fs.copyFileSync(bundled, ARTICLES_FILE);
  }
}

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string; // ISO date
  locale: "fr" | "en";
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ARTICLES_FILE)) {
    fs.writeFileSync(ARTICLES_FILE, JSON.stringify([], null, 2));
  }
}

export function getArticles(): Article[] {
  ensureDataDir();
  const raw = fs.readFileSync(ARTICLES_FILE, "utf-8");
  return JSON.parse(raw);
}

export function getArticlesByLocale(locale: string): Article[] {
  return getArticles()
    .filter((a) => a.locale === locale)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getArticleById(id: string): Article | undefined {
  return getArticles().find((a) => a.id === id);
}

export function createArticle(article: Omit<Article, "id">): Article {
  ensureDataDir();
  const articles = getArticles();
  const newArticle: Article = {
    ...article,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
  };
  articles.push(newArticle);
  fs.writeFileSync(ARTICLES_FILE, JSON.stringify(articles, null, 2));
  return newArticle;
}

export function updateArticle(id: string, data: Partial<Omit<Article, "id">>): Article | null {
  ensureDataDir();
  const articles = getArticles();
  const idx = articles.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  articles[idx] = { ...articles[idx], ...data };
  fs.writeFileSync(ARTICLES_FILE, JSON.stringify(articles, null, 2));
  return articles[idx];
}

export function deleteArticle(id: string): boolean {
  ensureDataDir();
  const articles = getArticles();
  const filtered = articles.filter((a) => a.id !== id);
  if (filtered.length === articles.length) return false;
  fs.writeFileSync(ARTICLES_FILE, JSON.stringify(filtered, null, 2));
  return true;
}
