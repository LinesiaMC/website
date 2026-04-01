import initSqlJs, { Database } from "sql.js";
import fs from "fs";
import path from "path";

const IS_VERCEL = !!process.env.VERCEL;
const DB_DIR = IS_VERCEL ? "/tmp" : path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "analytics.db");

let db: Database | null = null;
let initPromise: Promise<Database> | null = null;

function saveDb() {
  if (!db) return;
  try {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch {
    // /tmp may be unavailable in edge, silently fail
  }
}

export async function getDb(): Promise<Database> {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
      const buf = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buf);
    } else {
      db = new SQL.Database();
    }

    // Create tables
    db.run(`CREATE TABLE IF NOT EXISTS servers (
      server_id TEXT PRIMARY KEY,
      server_name TEXT NOT NULL,
      last_seen INTEGER NOT NULL,
      first_seen INTEGER NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS players (
      uuid TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      platform TEXT DEFAULT 'Unknown',
      first_seen INTEGER NOT NULL,
      last_seen INTEGER NOT NULL,
      total_playtime INTEGER DEFAULT 0,
      session_count INTEGER DEFAULT 0,
      ip_address TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_uuid TEXT NOT NULL,
      join_time INTEGER NOT NULL,
      leave_time INTEGER,
      duration INTEGER DEFAULT 0,
      platform TEXT,
      server_id TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_uuid TEXT NOT NULL,
      command TEXT NOT NULL,
      arguments TEXT,
      world TEXT,
      timestamp INTEGER NOT NULL,
      server_id TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS world_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_uuid TEXT NOT NULL,
      world_name TEXT NOT NULL,
      enter_time INTEGER NOT NULL,
      leave_time INTEGER,
      duration INTEGER DEFAULT 0,
      server_id TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_uuid TEXT NOT NULL,
      message TEXT NOT NULL,
      world TEXT,
      timestamp INTEGER NOT NULL,
      server_id TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS deaths (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_uuid TEXT NOT NULL,
      cause TEXT,
      world TEXT,
      x REAL, y REAL, z REAL,
      timestamp INTEGER NOT NULL,
      server_id TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS block_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_uuid TEXT NOT NULL,
      action TEXT NOT NULL,
      block_id TEXT NOT NULL,
      world TEXT,
      x INTEGER, y INTEGER, z INTEGER,
      timestamp INTEGER NOT NULL,
      server_id TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_uuid TEXT,
      player_name TEXT,
      category TEXT NOT NULL,
      action TEXT NOT NULL,
      detail TEXT,
      item_name TEXT,
      item_count INTEGER,
      item_uid TEXT,
      target_player TEXT,
      world TEXT,
      x REAL, y REAL, z REAL,
      level TEXT DEFAULT 'info',
      timestamp INTEGER NOT NULL,
      server_id TEXT
    )`);

    db.run(`CREATE INDEX IF NOT EXISTS idx_logs_player ON logs(player_name)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_logs_action ON logs(action)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_logs_item ON logs(item_name)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_logs_target ON logs(target_player)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_logs_server ON logs(server_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_logs_item_uid ON logs(item_uid)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_server ON sessions(server_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_commands_server ON commands(server_id)`);

    saveDb();
    return db;
  })();

  return initPromise;
}

// Helpers
export function run(database: Database, sql: string, params: unknown[] = []) {
  database.run(sql, params as never[]);
  saveDb();
}

export function getOne(database: Database, sql: string, params: unknown[] = []): Record<string, unknown> | null {
  const stmt = database.prepare(sql);
  stmt.bind(params as never[]);
  let row: Record<string, unknown> | null = null;
  if (stmt.step()) {
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    row = {};
    cols.forEach((c, i) => (row![c] = vals[i]));
  }
  stmt.free();
  return row;
}

export function getAll(database: Database, sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const stmt = database.prepare(sql);
  stmt.bind(params as never[]);
  const rows: Record<string, unknown>[] = [];
  const cols = stmt.getColumnNames();
  while (stmt.step()) {
    const vals = stmt.get();
    const row: Record<string, unknown> = {};
    cols.forEach((c, i) => (row[c] = vals[i]));
    rows.push(row);
  }
  stmt.free();
  return rows;
}

export function upsertServer(database: Database, serverId: string, serverName?: string) {
  if (!serverId) return;
  const now = Date.now();
  run(database, `INSERT INTO servers (server_id, server_name, first_seen, last_seen) VALUES (?, ?, ?, ?)
    ON CONFLICT(server_id) DO UPDATE SET server_name = excluded.server_name, last_seen = excluded.last_seen`,
    [serverId, serverName || serverId, now, now]);
}

export function serverFilter(queryParam: string | null, prefix = "") {
  const col = prefix ? `${prefix}.server_id` : "server_id";
  if (!queryParam || queryParam === "all") return { where: "", params: [] as unknown[] };
  return { where: `${col} = ?`, params: [queryParam] as unknown[] };
}
