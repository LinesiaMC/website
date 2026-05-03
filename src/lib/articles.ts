import { getDb, getAll, getOne, run } from "./analytics-db";

export const DEFAULT_ARTICLE_IMAGE = "/images/logo_sans_fond.png";

export const ARTICLE_IMAGE_PRESETS = [
  "/images/logo_sans_fond.png",
  "/images/linesia_sans_fond.png",
  "/images/1024.jpg",
  "/images/1024_title.png",
  "/images/farm.jpg",
  "/images/is.jpg",
  "/images/kitfffa.jpg",
  "/images/warzone.png",
  "/images/gems1.png",
  "/images/gems2.png",
  "/images/gems3.png",
  "/images/gems4.png",
];

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string; // ISO date
  locale: "fr" | "en";
  image: string;
  published: boolean;
}

export interface FetchOptions {
  includeDrafts?: boolean;
}

function rowToArticle(row: Record<string, unknown>): Article {
  const image = (row.image as string) || "";
  const published = row.published;
  return {
    id: row.id as string,
    title: row.title as string,
    excerpt: row.excerpt as string,
    content: row.content as string,
    date: row.date as string,
    locale: row.locale as "fr" | "en",
    image: image || DEFAULT_ARTICLE_IMAGE,
    published: published === undefined || published === null ? true
      : typeof published === "boolean" ? published
      : Number(published) === 1,
  };
}

export async function getArticles(options: FetchOptions = {}): Promise<Article[]> {
  const db = await getDb();
  const sql = options.includeDrafts
    ? "SELECT * FROM articles ORDER BY date DESC"
    : "SELECT * FROM articles WHERE published = true ORDER BY date DESC";
  const rows = await getAll(db, sql);
  return rows.map(rowToArticle);
}

export async function getArticlesByLocale(locale: string, options: FetchOptions = {}): Promise<Article[]> {
  const db = await getDb();
  const sql = options.includeDrafts
    ? "SELECT * FROM articles WHERE locale = ? ORDER BY date DESC"
    : "SELECT * FROM articles WHERE locale = ? AND published = true ORDER BY date DESC";
  const rows = await getAll(db, sql, [locale]);
  return rows.map(rowToArticle);
}

export async function getArticleById(id: string, options: FetchOptions = {}): Promise<Article | undefined> {
  const db = await getDb();
  const row = await getOne(db, "SELECT * FROM articles WHERE id = ?", [id]);
  if (!row) return undefined;
  const article = rowToArticle(row);
  if (!options.includeDrafts && !article.published) return undefined;
  return article;
}

export async function createArticle(article: Omit<Article, "id">): Promise<Article> {
  const db = await getDb();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const image = article.image?.trim() || DEFAULT_ARTICLE_IMAGE;
  const published = !!article.published;
  await run(db, "INSERT INTO articles (id, title, excerpt, content, date, locale, image, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
    id, article.title, article.excerpt, article.content, article.date, article.locale, image, published,
  ]);
  return { ...article, id, image, published };
}

export async function updateArticle(id: string, data: Partial<Omit<Article, "id">>): Promise<Article | null> {
  const db = await getDb();
  const existing = await getOne(db, "SELECT * FROM articles WHERE id = ?", [id]);
  if (!existing) return null;

  const updated = { ...rowToArticle(existing), ...data };
  const image = updated.image?.trim() || DEFAULT_ARTICLE_IMAGE;
  const published = !!updated.published;
  await run(db, "UPDATE articles SET title = ?, excerpt = ?, content = ?, date = ?, locale = ?, image = ?, published = ? WHERE id = ?", [
    updated.title, updated.excerpt, updated.content, updated.date, updated.locale, image, published, id,
  ]);
  return { ...updated, image, published };
}

export async function deleteArticle(id: string): Promise<boolean> {
  const db = await getDb();
  const existing = await getOne(db, "SELECT id FROM articles WHERE id = ?", [id]);
  if (!existing) return false;
  await run(db, "DELETE FROM articles WHERE id = ?", [id]);
  return true;
}
