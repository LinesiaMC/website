import { getDb, getAll, getOne, run } from "./analytics-db";

export interface WikiPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  icon: string;
  parentId: string | null;
  order: number;
}

function rowToWikiPage(row: Record<string, unknown>): WikiPage {
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    content: (row.content as string) || "",
    icon: (row.icon as string) || "",
    parentId: (row.parent_id as string) || null,
    order: (row.sort_order as number) || 0,
  };
}

export async function getWikiPages(): Promise<WikiPage[]> {
  const db = await getDb();
  const rows = await getAll(db, "SELECT * FROM wiki_pages ORDER BY sort_order ASC");
  return rows.map(rowToWikiPage);
}

export async function getWikiPageBySlug(slug: string): Promise<WikiPage | undefined> {
  const db = await getDb();
  const row = await getOne(db, "SELECT * FROM wiki_pages WHERE slug = ?", [slug]);
  return row ? rowToWikiPage(row) : undefined;
}

export async function getWikiPageById(id: string): Promise<WikiPage | undefined> {
  const db = await getDb();
  const row = await getOne(db, "SELECT * FROM wiki_pages WHERE id = ?", [id]);
  return row ? rowToWikiPage(row) : undefined;
}

export async function getWikiChildren(parentId: string | null): Promise<WikiPage[]> {
  const db = await getDb();
  const rows = parentId
    ? await getAll(db, "SELECT * FROM wiki_pages WHERE parent_id = ? ORDER BY sort_order ASC", [parentId])
    : await getAll(db, "SELECT * FROM wiki_pages WHERE parent_id IS NULL ORDER BY sort_order ASC");
  return rows.map(rowToWikiPage);
}

export async function createWikiPage(page: Omit<WikiPage, "id">): Promise<WikiPage> {
  const db = await getDb();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  await run(db, "INSERT INTO wiki_pages (id, slug, title, content, icon, parent_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)", [
    id, page.slug, page.title, page.content, page.icon, page.parentId, page.order,
  ]);
  return { ...page, id };
}

export async function updateWikiPage(id: string, data: Partial<Omit<WikiPage, "id">>): Promise<WikiPage | null> {
  const db = await getDb();
  const existing = await getOne(db, "SELECT * FROM wiki_pages WHERE id = ?", [id]);
  if (!existing) return null;

  const current = rowToWikiPage(existing);
  const updated = {
    ...current,
    ...(data.slug !== undefined && { slug: data.slug }),
    ...(data.title !== undefined && { title: data.title }),
    ...(data.content !== undefined && { content: data.content }),
    ...(data.icon !== undefined && { icon: data.icon }),
    ...(data.parentId !== undefined && { parentId: data.parentId }),
    ...(data.order !== undefined && { order: data.order }),
  };

  await run(db, "UPDATE wiki_pages SET slug = ?, title = ?, content = ?, icon = ?, parent_id = ?, sort_order = ? WHERE id = ?", [
    updated.slug, updated.title, updated.content, updated.icon, updated.parentId, updated.order, id,
  ]);
  return updated;
}

export async function deleteWikiPage(id: string): Promise<boolean> {
  const db = await getDb();
  const existing = await getOne(db, "SELECT id FROM wiki_pages WHERE id = ?", [id]);
  if (!existing) return false;

  // Recursively delete children
  const children = await getAll(db, "SELECT id FROM wiki_pages WHERE parent_id = ?", [id]);
  for (const child of children) {
    await deleteWikiPage(child.id as string);
  }
  await run(db, "DELETE FROM wiki_pages WHERE id = ?", [id]);
  return true;
}

export async function setWikiPages(pages: WikiPage[]): Promise<void> {
  const db = await getDb();
  await run(db, "DELETE FROM wiki_pages");
  for (const page of pages) {
    await run(db, "INSERT INTO wiki_pages (id, slug, title, content, icon, parent_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)", [
      page.id, page.slug, page.title, page.content, page.icon, page.parentId, page.order,
    ]);
  }
}
