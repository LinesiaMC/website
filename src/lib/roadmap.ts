import { getDb, getAll, getOne, run } from "./analytics-db";

export type RoadmapStatus = "planned" | "in_progress" | "released";

export interface RoadmapItem {
  title: string;
  done: boolean;
}

export interface RoadmapEntry {
  id: string;
  version: string;
  title: string;
  description: string;
  status: RoadmapStatus;
  date: string;
  locale: "fr" | "en";
  items: RoadmapItem[];
  sortOrder: number;
  createdAt: number;
}

function rowToEntry(row: Record<string, unknown>): RoadmapEntry {
  let items: RoadmapItem[] = [];
  try {
    const parsed = JSON.parse((row.items as string) || "[]");
    if (Array.isArray(parsed)) {
      items = parsed
        .filter((i) => i && typeof i.title === "string")
        .map((i) => ({ title: String(i.title), done: Boolean(i.done) }));
    }
  } catch { /* ignore */ }

  return {
    id: row.id as string,
    version: (row.version as string) || "",
    title: row.title as string,
    description: (row.description as string) || "",
    status: (row.status as RoadmapStatus) || "planned",
    date: (row.date as string) || "",
    locale: ((row.locale as string) === "en" ? "en" : "fr") as "fr" | "en",
    items,
    sortOrder: Number(row.sort_order) || 0,
    createdAt: Number(row.created_at) || 0,
  };
}

export async function getRoadmapEntries(): Promise<RoadmapEntry[]> {
  const db = await getDb();
  const rows = await getAll(db, "SELECT * FROM roadmap_entries ORDER BY sort_order ASC, created_at DESC");
  return rows.map(rowToEntry);
}

export async function getRoadmapEntriesByLocale(locale: string): Promise<RoadmapEntry[]> {
  const db = await getDb();
  const rows = await getAll(
    db,
    "SELECT * FROM roadmap_entries WHERE locale = ? ORDER BY sort_order ASC, created_at DESC",
    [locale],
  );
  return rows.map(rowToEntry);
}

export async function createRoadmapEntry(
  data: Omit<RoadmapEntry, "id" | "createdAt">,
): Promise<RoadmapEntry> {
  const db = await getDb();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const createdAt = Date.now();
  await run(
    db,
    `INSERT INTO roadmap_entries (id, version, title, description, status, date, locale, items, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.version,
      data.title,
      data.description,
      data.status,
      data.date,
      data.locale,
      JSON.stringify(data.items || []),
      data.sortOrder,
      createdAt,
    ],
  );
  return { ...data, id, createdAt };
}

export async function updateRoadmapEntry(
  id: string,
  data: Partial<Omit<RoadmapEntry, "id" | "createdAt">>,
): Promise<RoadmapEntry | null> {
  const db = await getDb();
  const existing = await getOne(db, "SELECT * FROM roadmap_entries WHERE id = ?", [id]);
  if (!existing) return null;
  const current = rowToEntry(existing);
  const updated: RoadmapEntry = { ...current, ...data };
  await run(
    db,
    `UPDATE roadmap_entries
     SET version = ?, title = ?, description = ?, status = ?, date = ?, locale = ?, items = ?, sort_order = ?
     WHERE id = ?`,
    [
      updated.version,
      updated.title,
      updated.description,
      updated.status,
      updated.date,
      updated.locale,
      JSON.stringify(updated.items || []),
      updated.sortOrder,
      id,
    ],
  );
  return updated;
}

export async function deleteRoadmapEntry(id: string): Promise<boolean> {
  const db = await getDb();
  const existing = await getOne(db, "SELECT id FROM roadmap_entries WHERE id = ?", [id]);
  if (!existing) return false;
  await run(db, "DELETE FROM roadmap_entries WHERE id = ?", [id]);
  return true;
}
