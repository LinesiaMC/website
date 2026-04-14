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
}

function rowToArticle(row: Record<string, unknown>): Article {
  const image = (row.image as string) || "";
  return {
    id: row.id as string,
    title: row.title as string,
    excerpt: row.excerpt as string,
    content: row.content as string,
    date: row.date as string,
    locale: row.locale as "fr" | "en",
    image: image || DEFAULT_ARTICLE_IMAGE,
  };
}

export async function getArticles(): Promise<Article[]> {
  const db = await getDb();
  const rows = await getAll(db, "SELECT * FROM articles ORDER BY date DESC");
  return rows.map(rowToArticle);
}

export async function getArticlesByLocale(locale: string): Promise<Article[]> {
  const db = await getDb();
  const rows = await getAll(db, "SELECT * FROM articles WHERE locale = ? ORDER BY date DESC", [locale]);
  return rows.map(rowToArticle);
}

export async function getArticleById(id: string): Promise<Article | undefined> {
  const db = await getDb();
  const row = await getOne(db, "SELECT * FROM articles WHERE id = ?", [id]);
  return row ? rowToArticle(row) : undefined;
}

export async function createArticle(article: Omit<Article, "id">): Promise<Article> {
  const db = await getDb();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const image = article.image?.trim() || DEFAULT_ARTICLE_IMAGE;
  await run(db, "INSERT INTO articles (id, title, excerpt, content, date, locale, image) VALUES (?, ?, ?, ?, ?, ?, ?)", [
    id, article.title, article.excerpt, article.content, article.date, article.locale, image,
  ]);
  return { ...article, id, image };
}

export async function updateArticle(id: string, data: Partial<Omit<Article, "id">>): Promise<Article | null> {
  const db = await getDb();
  const existing = await getOne(db, "SELECT * FROM articles WHERE id = ?", [id]);
  if (!existing) return null;

  const updated = { ...rowToArticle(existing), ...data };
  const image = updated.image?.trim() || DEFAULT_ARTICLE_IMAGE;
  await run(db, "UPDATE articles SET title = ?, excerpt = ?, content = ?, date = ?, locale = ?, image = ? WHERE id = ?", [
    updated.title, updated.excerpt, updated.content, updated.date, updated.locale, image, id,
  ]);
  return { ...updated, image };
}

export async function deleteArticle(id: string): Promise<boolean> {
  const db = await getDb();
  const existing = await getOne(db, "SELECT id FROM articles WHERE id = ?", [id]);
  if (!existing) return false;
  await run(db, "DELETE FROM articles WHERE id = ?", [id]);
  return true;
}
