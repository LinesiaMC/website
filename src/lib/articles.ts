import { getDb, getAll, getOne, run } from "./analytics-db";

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string; // ISO date
  locale: "fr" | "en";
}

function rowToArticle(row: Record<string, unknown>): Article {
  return {
    id: row.id as string,
    title: row.title as string,
    excerpt: row.excerpt as string,
    content: row.content as string,
    date: row.date as string,
    locale: row.locale as "fr" | "en",
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
  await run(db, "INSERT INTO articles (id, title, excerpt, content, date, locale) VALUES (?, ?, ?, ?, ?, ?)", [
    id, article.title, article.excerpt, article.content, article.date, article.locale,
  ]);
  return { ...article, id };
}

export async function updateArticle(id: string, data: Partial<Omit<Article, "id">>): Promise<Article | null> {
  const db = await getDb();
  const existing = await getOne(db, "SELECT * FROM articles WHERE id = ?", [id]);
  if (!existing) return null;

  const updated = { ...rowToArticle(existing), ...data };
  await run(db, "UPDATE articles SET title = ?, excerpt = ?, content = ?, date = ?, locale = ? WHERE id = ?", [
    updated.title, updated.excerpt, updated.content, updated.date, updated.locale, id,
  ]);
  return updated;
}

export async function deleteArticle(id: string): Promise<boolean> {
  const db = await getDb();
  const existing = await getOne(db, "SELECT id FROM articles WHERE id = ?", [id]);
  if (!existing) return false;
  await run(db, "DELETE FROM articles WHERE id = ?", [id]);
  return true;
}
