import { randomBytes } from "crypto";
import { getDb, getAll, getOne, run } from "./analytics-db";

export type CommunityCategory =
  | "general"
  | "ideas"
  | "bugs"
  | "videos"
  | "packs"
  | "factions"
  | "offtopic";

export const COMMUNITY_CATEGORIES: CommunityCategory[] = [
  "general", "ideas", "bugs", "videos", "packs", "factions", "offtopic",
];

export const CATEGORY_META: Record<CommunityCategory, {
  fr: string; en: string; emoji: string; color: string; desc: { fr: string; en: string };
}> = {
  general:  { fr: "Général",      en: "General",    emoji: "💬", color: "#EC4899", desc: { fr: "Discussions libres entre joueurs", en: "Open discussions between players" } },
  ideas:    { fr: "Idées",        en: "Ideas",      emoji: "💡", color: "#F59E0B", desc: { fr: "Proposez de nouvelles fonctionnalités", en: "Suggest new features" } },
  bugs:     { fr: "Bugs",         en: "Bugs",       emoji: "🐛", color: "#EF4444", desc: { fr: "Signaler les bugs en jeu", en: "Report in-game bugs" } },
  videos:   { fr: "Vidéos",       en: "Videos",     emoji: "🎬", color: "#A855F7", desc: { fr: "Partagez vos vidéos sur Linesia", en: "Share your Linesia videos" } },
  packs:    { fr: "Packs",        en: "Packs",      emoji: "📦", color: "#14B8A6", desc: { fr: "Partagez vos resource packs", en: "Share your resource packs" } },
  factions: { fr: "Factions",     en: "Factions",   emoji: "⚔️", color: "#6366F1", desc: { fr: "Recrutement & promotion de factions", en: "Faction recruitment & promotion" } },
  offtopic: { fr: "Hors-sujet",   en: "Off-topic",  emoji: "🎲", color: "#64748B", desc: { fr: "Tout le reste", en: "Everything else" } },
};

export interface CommunityAuthor {
  accountId: string;
  displayName: string;
  playerUuid: string | null;
  avatarUrl: string | null;
  ingameRank: string | null;
}

export interface CommunityThread {
  id: string;
  category: CommunityCategory;
  authorAccountId: string;
  authorName: string;
  authorUuid: string | null;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
  lastPostAt: number;
  postCount: number;
  likeCount: number;
  pinned: boolean;
  locked: boolean;
  deleted: boolean;
  deletedBy: string | null;
  liked?: boolean;
}

export interface CommunityPost {
  id: string;
  threadId: string;
  authorAccountId: string;
  authorName: string;
  authorUuid: string | null;
  content: string;
  createdAt: number;
  editedAt: number | null;
  likeCount: number;
  deleted: boolean;
  deletedBy: string | null;
  liked?: boolean;
}

export interface CommunityBan {
  accountId: string;
  reason: string | null;
  bannedBy: string;
  bannedAt: number;
  expiresAt: number | null;
}

const THREAD_TITLE_MAX = 120;
const THREAD_BODY_MAX = 8000;
const POST_CONTENT_MAX = 4000;

// Rate-limit windows (ms / counts)
const THREAD_WINDOW_MS = 10 * 60 * 1000;
const THREAD_WINDOW_MAX = 5;
const POST_WINDOW_MS = 60 * 1000;
const POST_WINDOW_MAX = 8;

let schemaReady = false;

export async function ensureCommunitySchema(): Promise<void> {
  if (schemaReady) return;
  const db = await getDb();
  await db.batch([
    `CREATE TABLE IF NOT EXISTS community_threads (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      author_account_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_uuid TEXT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_post_at INTEGER NOT NULL,
      post_count INTEGER NOT NULL DEFAULT 0,
      like_count INTEGER NOT NULL DEFAULT 0,
      pinned INTEGER NOT NULL DEFAULT 0,
      locked INTEGER NOT NULL DEFAULT 0,
      deleted INTEGER NOT NULL DEFAULT 0,
      deleted_by TEXT,
      deleted_at INTEGER
    )`,
    `CREATE INDEX IF NOT EXISTS idx_ct_cat      ON community_threads(category, deleted, pinned DESC, last_post_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_ct_author   ON community_threads(author_account_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ct_lastpost ON community_threads(last_post_at DESC)`,
    `CREATE TABLE IF NOT EXISTS community_posts (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      author_account_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_uuid TEXT,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      edited_at INTEGER,
      like_count INTEGER NOT NULL DEFAULT 0,
      deleted INTEGER NOT NULL DEFAULT 0,
      deleted_by TEXT,
      deleted_at INTEGER
    )`,
    `CREATE INDEX IF NOT EXISTS idx_cp_thread ON community_posts(thread_id, created_at ASC)`,
    `CREATE INDEX IF NOT EXISTS idx_cp_author ON community_posts(author_account_id)`,
    `CREATE TABLE IF NOT EXISTS community_likes (
      account_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (account_id, target_type, target_id)
    )`,
    `CREATE TABLE IF NOT EXISTS community_reports (
      id TEXT PRIMARY KEY,
      reporter_account_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      reason TEXT,
      created_at INTEGER NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0,
      resolved_by TEXT,
      resolved_at INTEGER
    )`,
    `CREATE INDEX IF NOT EXISTS idx_cr_target ON community_reports(target_type, target_id)`,
    `CREATE INDEX IF NOT EXISTS idx_cr_open   ON community_reports(resolved, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS community_bans (
      account_id TEXT PRIMARY KEY,
      reason TEXT,
      banned_by TEXT NOT NULL,
      banned_at INTEGER NOT NULL,
      expires_at INTEGER
    )`,
  ]);
  schemaReady = true;
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${randomBytes(4).toString("hex")}`;
}

export function validateCategory(v: unknown): CommunityCategory | null {
  return typeof v === "string" && (COMMUNITY_CATEGORIES as string[]).includes(v)
    ? (v as CommunityCategory)
    : null;
}

function sanitizeText(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  // Strip control chars except \n and \t, collapse excessive blank lines, trim.
  const cleaned = raw
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
  return cleaned.slice(0, max);
}

export function validateThreadInput(body: unknown): {
  ok: true; category: CommunityCategory; title: string; content: string;
} | { ok: false; error: string } {
  const b = body as Record<string, unknown>;
  const category = validateCategory(b?.category);
  if (!category) return { ok: false, error: "invalid_category" };
  const title = sanitizeText(b?.title, THREAD_TITLE_MAX);
  const content = sanitizeText(b?.body, THREAD_BODY_MAX);
  if (title.length < 4) return { ok: false, error: "title_too_short" };
  if (content.length < 4) return { ok: false, error: "body_too_short" };
  return { ok: true, category, title, content };
}

export function validatePostInput(body: unknown): { ok: true; content: string } | { ok: false; error: string } {
  const b = body as Record<string, unknown>;
  const content = sanitizeText(b?.content, POST_CONTENT_MAX);
  if (content.length < 2) return { ok: false, error: "content_too_short" };
  return { ok: true, content };
}

export async function isAccountBanned(accountId: string): Promise<CommunityBan | null> {
  await ensureCommunitySchema();
  const db = await getDb();
  const row = await getOne(db, "SELECT * FROM community_bans WHERE account_id = ?", [accountId]);
  if (!row) return null;
  const exp = row.expires_at as number | null;
  if (exp && exp < Date.now()) {
    await run(db, "DELETE FROM community_bans WHERE account_id = ?", [accountId]);
    return null;
  }
  return {
    accountId: row.account_id as string,
    reason: (row.reason as string) || null,
    bannedBy: row.banned_by as string,
    bannedAt: row.banned_at as number,
    expiresAt: exp,
  };
}

export async function banAccount(accountId: string, bannedBy: string, reason: string | null, expiresAt: number | null): Promise<void> {
  await ensureCommunitySchema();
  const db = await getDb();
  await run(db,
    `INSERT INTO community_bans (account_id, reason, banned_by, banned_at, expires_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(account_id) DO UPDATE SET
       reason = excluded.reason, banned_by = excluded.banned_by,
       banned_at = excluded.banned_at, expires_at = excluded.expires_at`,
    [accountId, reason, bannedBy, Date.now(), expiresAt]);
}

export async function unbanAccount(accountId: string): Promise<void> {
  await ensureCommunitySchema();
  const db = await getDb();
  await run(db, "DELETE FROM community_bans WHERE account_id = ?", [accountId]);
}

export async function listBans(): Promise<CommunityBan[]> {
  await ensureCommunitySchema();
  const db = await getDb();
  const rows = await getAll(db, "SELECT * FROM community_bans ORDER BY banned_at DESC");
  return rows.map((r) => ({
    accountId: r.account_id as string,
    reason: (r.reason as string) || null,
    bannedBy: r.banned_by as string,
    bannedAt: r.banned_at as number,
    expiresAt: (r.expires_at as number) || null,
  }));
}

async function checkThreadRateLimit(accountId: string): Promise<boolean> {
  const db = await getDb();
  const since = Date.now() - THREAD_WINDOW_MS;
  const row = await getOne(db,
    "SELECT COUNT(*) as c FROM community_threads WHERE author_account_id = ? AND created_at > ?",
    [accountId, since]);
  return ((row?.c as number) || 0) < THREAD_WINDOW_MAX;
}

async function checkPostRateLimit(accountId: string): Promise<boolean> {
  const db = await getDb();
  const since = Date.now() - POST_WINDOW_MS;
  const row = await getOne(db,
    "SELECT COUNT(*) as c FROM community_posts WHERE author_account_id = ? AND created_at > ?",
    [accountId, since]);
  return ((row?.c as number) || 0) < POST_WINDOW_MAX;
}

function rowToThread(r: Record<string, unknown>): CommunityThread {
  return {
    id: r.id as string,
    category: r.category as CommunityCategory,
    authorAccountId: r.author_account_id as string,
    authorName: r.author_name as string,
    authorUuid: (r.author_uuid as string) || null,
    title: r.title as string,
    body: r.body as string,
    createdAt: r.created_at as number,
    updatedAt: r.updated_at as number,
    lastPostAt: r.last_post_at as number,
    postCount: (r.post_count as number) || 0,
    likeCount: (r.like_count as number) || 0,
    pinned: Number(r.pinned) === 1,
    locked: Number(r.locked) === 1,
    deleted: Number(r.deleted) === 1,
    deletedBy: (r.deleted_by as string) || null,
  };
}

function rowToPost(r: Record<string, unknown>): CommunityPost {
  return {
    id: r.id as string,
    threadId: r.thread_id as string,
    authorAccountId: r.author_account_id as string,
    authorName: r.author_name as string,
    authorUuid: (r.author_uuid as string) || null,
    content: r.content as string,
    createdAt: r.created_at as number,
    editedAt: (r.edited_at as number) || null,
    likeCount: (r.like_count as number) || 0,
    deleted: Number(r.deleted) === 1,
    deletedBy: (r.deleted_by as string) || null,
  };
}

export interface ListThreadsOpts {
  category?: CommunityCategory | null;
  limit?: number;
  offset?: number;
  sort?: "recent" | "top" | "new";
  search?: string | null;
  viewerAccountId?: string | null;
  includeDeleted?: boolean;
}

export async function listThreads(opts: ListThreadsOpts = {}): Promise<{ threads: CommunityThread[]; total: number }> {
  await ensureCommunitySchema();
  const db = await getDb();
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 50);
  const offset = Math.max(opts.offset ?? 0, 0);

  const wheres: string[] = [];
  const params: unknown[] = [];
  if (!opts.includeDeleted) wheres.push("deleted = 0");
  if (opts.category) { wheres.push("category = ?"); params.push(opts.category); }
  if (opts.search && opts.search.trim()) {
    const like = `%${opts.search.trim().replace(/[%_]/g, (m) => `\\${m}`)}%`;
    wheres.push("(title LIKE ? ESCAPE '\\' OR body LIKE ? ESCAPE '\\')");
    params.push(like, like);
  }
  const whereSql = wheres.length ? `WHERE ${wheres.join(" AND ")}` : "";

  let orderSql = "ORDER BY pinned DESC, last_post_at DESC";
  if (opts.sort === "top") orderSql = "ORDER BY pinned DESC, like_count DESC, post_count DESC, last_post_at DESC";
  if (opts.sort === "new") orderSql = "ORDER BY pinned DESC, created_at DESC";

  const rows = await getAll(db,
    `SELECT * FROM community_threads ${whereSql} ${orderSql} LIMIT ? OFFSET ?`,
    [...params, limit, offset]);
  const countRow = await getOne(db,
    `SELECT COUNT(*) as c FROM community_threads ${whereSql}`, params);

  const threads = rows.map(rowToThread);
  if (opts.viewerAccountId && threads.length > 0) {
    const ids = threads.map((t) => t.id);
    const placeholders = ids.map(() => "?").join(",");
    const liked = await getAll(db,
      `SELECT target_id FROM community_likes WHERE account_id = ? AND target_type = 'thread' AND target_id IN (${placeholders})`,
      [opts.viewerAccountId, ...ids]);
    const likedSet = new Set(liked.map((r) => r.target_id as string));
    for (const t of threads) t.liked = likedSet.has(t.id);
  }

  return { threads, total: (countRow?.c as number) || 0 };
}

export async function getThread(id: string, viewerAccountId?: string | null): Promise<CommunityThread | null> {
  await ensureCommunitySchema();
  const db = await getDb();
  const row = await getOne(db, "SELECT * FROM community_threads WHERE id = ?", [id]);
  if (!row) return null;
  const t = rowToThread(row);
  if (viewerAccountId) {
    const liked = await getOne(db,
      "SELECT 1 FROM community_likes WHERE account_id = ? AND target_type = 'thread' AND target_id = ?",
      [viewerAccountId, id]);
    t.liked = !!liked;
  }
  return t;
}

export async function listPosts(threadId: string, viewerAccountId?: string | null): Promise<CommunityPost[]> {
  await ensureCommunitySchema();
  const db = await getDb();
  const rows = await getAll(db,
    "SELECT * FROM community_posts WHERE thread_id = ? ORDER BY created_at ASC",
    [threadId]);
  const posts = rows.map(rowToPost);
  if (viewerAccountId && posts.length > 0) {
    const ids = posts.map((p) => p.id);
    const placeholders = ids.map(() => "?").join(",");
    const liked = await getAll(db,
      `SELECT target_id FROM community_likes WHERE account_id = ? AND target_type = 'post' AND target_id IN (${placeholders})`,
      [viewerAccountId, ...ids]);
    const likedSet = new Set(liked.map((r) => r.target_id as string));
    for (const p of posts) p.liked = likedSet.has(p.id);
  }
  return posts;
}

export interface CreateThreadInput {
  category: CommunityCategory;
  title: string;
  body: string;
  author: CommunityAuthor;
}

export async function createThread(input: CreateThreadInput): Promise<{ ok: true; thread: CommunityThread } | { ok: false; error: string }> {
  await ensureCommunitySchema();
  if (await isAccountBanned(input.author.accountId)) return { ok: false, error: "banned" };
  if (!(await checkThreadRateLimit(input.author.accountId))) return { ok: false, error: "rate_limited" };
  const db = await getDb();
  const id = newId("t");
  const now = Date.now();
  await run(db,
    `INSERT INTO community_threads (
       id, category, author_account_id, author_name, author_uuid,
       title, body, created_at, updated_at, last_post_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.category, input.author.accountId, input.author.displayName, input.author.playerUuid,
      input.title, input.body, now, now, now]);
  const thread = await getThread(id, input.author.accountId);
  return { ok: true, thread: thread! };
}

export async function createPost(threadId: string, author: CommunityAuthor, content: string): Promise<{ ok: true; post: CommunityPost } | { ok: false; error: string }> {
  await ensureCommunitySchema();
  if (await isAccountBanned(author.accountId)) return { ok: false, error: "banned" };
  const db = await getDb();
  const thread = await getOne(db, "SELECT locked, deleted FROM community_threads WHERE id = ?", [threadId]);
  if (!thread) return { ok: false, error: "not_found" };
  if (Number(thread.deleted) === 1) return { ok: false, error: "thread_deleted" };
  if (Number(thread.locked) === 1) return { ok: false, error: "thread_locked" };
  if (!(await checkPostRateLimit(author.accountId))) return { ok: false, error: "rate_limited" };

  const id = newId("p");
  const now = Date.now();
  await run(db,
    `INSERT INTO community_posts (
       id, thread_id, author_account_id, author_name, author_uuid, content, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, threadId, author.accountId, author.displayName, author.playerUuid, content, now]);
  await run(db,
    `UPDATE community_threads SET post_count = post_count + 1, last_post_at = ?, updated_at = ?
     WHERE id = ?`,
    [now, now, threadId]);
  const row = await getOne(db, "SELECT * FROM community_posts WHERE id = ?", [id]);
  return { ok: true, post: rowToPost(row!) };
}

export async function softDeleteThread(id: string, actor: string): Promise<boolean> {
  await ensureCommunitySchema();
  const db = await getDb();
  const now = Date.now();
  await run(db,
    "UPDATE community_threads SET deleted = 1, deleted_by = ?, deleted_at = ? WHERE id = ? AND deleted = 0",
    [actor, now, id]);
  return true;
}

export async function softDeletePost(id: string, actor: string): Promise<boolean> {
  await ensureCommunitySchema();
  const db = await getDb();
  const now = Date.now();
  await run(db,
    "UPDATE community_posts SET deleted = 1, deleted_by = ?, deleted_at = ? WHERE id = ? AND deleted = 0",
    [actor, now, id]);
  return true;
}

export async function setThreadPinned(id: string, pinned: boolean): Promise<void> {
  await ensureCommunitySchema();
  const db = await getDb();
  await run(db, "UPDATE community_threads SET pinned = ? WHERE id = ?", [pinned ? 1 : 0, id]);
}

export async function setThreadLocked(id: string, locked: boolean): Promise<void> {
  await ensureCommunitySchema();
  const db = await getDb();
  await run(db, "UPDATE community_threads SET locked = ? WHERE id = ?", [locked ? 1 : 0, id]);
}

export async function toggleLike(accountId: string, targetType: "thread" | "post", targetId: string): Promise<{ liked: boolean; count: number }> {
  await ensureCommunitySchema();
  const db = await getDb();
  const table = targetType === "thread" ? "community_threads" : "community_posts";
  const existing = await getOne(db,
    "SELECT 1 FROM community_likes WHERE account_id = ? AND target_type = ? AND target_id = ?",
    [accountId, targetType, targetId]);
  if (existing) {
    await run(db,
      "DELETE FROM community_likes WHERE account_id = ? AND target_type = ? AND target_id = ?",
      [accountId, targetType, targetId]);
    await run(db, `UPDATE ${table} SET like_count = MAX(like_count - 1, 0) WHERE id = ?`, [targetId]);
  } else {
    // ensure target exists before inserting like (prevents dangling likes)
    const t = await getOne(db, `SELECT 1 FROM ${table} WHERE id = ? AND deleted = 0`, [targetId]);
    if (!t) throw new Error("target_not_found");
    await run(db,
      "INSERT INTO community_likes (account_id, target_type, target_id, created_at) VALUES (?, ?, ?, ?)",
      [accountId, targetType, targetId, Date.now()]);
    await run(db, `UPDATE ${table} SET like_count = like_count + 1 WHERE id = ?`, [targetId]);
  }
  const row = await getOne(db, `SELECT like_count FROM ${table} WHERE id = ?`, [targetId]);
  return { liked: !existing, count: Number(row?.like_count) || 0 };
}

export async function reportTarget(reporterAccountId: string, targetType: "thread" | "post", targetId: string, reason: string | null): Promise<void> {
  await ensureCommunitySchema();
  const db = await getDb();
  const table = targetType === "thread" ? "community_threads" : "community_posts";
  const t = await getOne(db, `SELECT 1 FROM ${table} WHERE id = ?`, [targetId]);
  if (!t) throw new Error("target_not_found");
  // Prevent duplicate open reports from the same reporter on the same target.
  const existing = await getOne(db,
    "SELECT 1 FROM community_reports WHERE reporter_account_id = ? AND target_type = ? AND target_id = ? AND resolved = 0",
    [reporterAccountId, targetType, targetId]);
  if (existing) return;
  await run(db,
    `INSERT INTO community_reports (id, reporter_account_id, target_type, target_id, reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [newId("r"), reporterAccountId, targetType, targetId,
      (reason || "").slice(0, 500) || null, Date.now()]);
}

export interface CommunityReport {
  id: string;
  reporterAccountId: string;
  targetType: "thread" | "post";
  targetId: string;
  reason: string | null;
  createdAt: number;
  resolved: boolean;
}

export async function listOpenReports(limit = 50): Promise<CommunityReport[]> {
  await ensureCommunitySchema();
  const db = await getDb();
  const rows = await getAll(db,
    "SELECT * FROM community_reports WHERE resolved = 0 ORDER BY created_at DESC LIMIT ?",
    [Math.min(Math.max(limit, 1), 200)]);
  return rows.map((r) => ({
    id: r.id as string,
    reporterAccountId: r.reporter_account_id as string,
    targetType: r.target_type as "thread" | "post",
    targetId: r.target_id as string,
    reason: (r.reason as string) || null,
    createdAt: r.created_at as number,
    resolved: Number(r.resolved) === 1,
  }));
}

export async function resolveReport(id: string, actor: string): Promise<void> {
  await ensureCommunitySchema();
  const db = await getDb();
  await run(db,
    "UPDATE community_reports SET resolved = 1, resolved_by = ?, resolved_at = ? WHERE id = ?",
    [actor, Date.now(), id]);
}

/** Aggregated category stats for the landing page. */
export async function getCategoryStats(): Promise<Record<CommunityCategory, { threads: number; posts: number }>> {
  await ensureCommunitySchema();
  const db = await getDb();
  const rows = await getAll(db,
    `SELECT category, COUNT(*) as threads, COALESCE(SUM(post_count), 0) as posts
     FROM community_threads WHERE deleted = 0 GROUP BY category`);
  const out: Record<string, { threads: number; posts: number }> = {};
  for (const c of COMMUNITY_CATEGORIES) out[c] = { threads: 0, posts: 0 };
  for (const r of rows) {
    const c = r.category as string;
    if (COMMUNITY_CATEGORIES.includes(c as CommunityCategory)) {
      out[c] = { threads: Number(r.threads) || 0, posts: Number(r.posts) || 0 };
    }
  }
  return out as Record<CommunityCategory, { threads: number; posts: number }>;
}
