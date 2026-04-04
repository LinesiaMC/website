import { createClient, type Client, type Row } from "@libsql/client";

let client: Client | null = null;

function getClient(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error("TURSO_DATABASE_URL is not set");
  }

  client = createClient({ url, authToken });
  return client;
}

let initialized = false;

export async function getDb(): Promise<Client> {
  const db = getClient();

  if (!initialized) {
    initialized = true;

    await db.batch([
      `CREATE TABLE IF NOT EXISTS servers (
        server_id TEXT PRIMARY KEY,
        server_name TEXT NOT NULL,
        last_seen INTEGER NOT NULL,
        first_seen INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS players (
        uuid TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        platform TEXT DEFAULT 'Unknown',
        first_seen INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        total_playtime INTEGER DEFAULT 0,
        session_count INTEGER DEFAULT 0,
        ip_address TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_uuid TEXT NOT NULL,
        join_time INTEGER NOT NULL,
        leave_time INTEGER,
        duration INTEGER DEFAULT 0,
        platform TEXT,
        server_id TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS commands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_uuid TEXT NOT NULL,
        command TEXT NOT NULL,
        arguments TEXT,
        world TEXT,
        timestamp INTEGER NOT NULL,
        server_id TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS world_visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_uuid TEXT NOT NULL,
        world_name TEXT NOT NULL,
        enter_time INTEGER NOT NULL,
        leave_time INTEGER,
        duration INTEGER DEFAULT 0,
        server_id TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_uuid TEXT NOT NULL,
        message TEXT NOT NULL,
        world TEXT,
        timestamp INTEGER NOT NULL,
        server_id TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS deaths (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_uuid TEXT NOT NULL,
        cause TEXT,
        world TEXT,
        x REAL, y REAL, z REAL,
        timestamp INTEGER NOT NULL,
        server_id TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS casino_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_uuid TEXT NOT NULL,
        game TEXT NOT NULL,
        bet_amount INTEGER NOT NULL DEFAULT 0,
        win_amount INTEGER NOT NULL DEFAULT 0,
        net_result INTEGER NOT NULL DEFAULT 0,
        currency TEXT DEFAULT 'gems',
        timestamp INTEGER NOT NULL,
        server_id TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS block_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_uuid TEXT NOT NULL,
        action TEXT NOT NULL,
        block_id TEXT NOT NULL,
        world TEXT,
        x INTEGER, y INTEGER, z INTEGER,
        timestamp INTEGER NOT NULL,
        server_id TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS logs (
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
      )`,
      `CREATE INDEX IF NOT EXISTS idx_logs_player ON logs(player_name)`,
      `CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category)`,
      `CREATE INDEX IF NOT EXISTS idx_logs_action ON logs(action)`,
      `CREATE INDEX IF NOT EXISTS idx_logs_item ON logs(item_name)`,
      `CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)`,
      `CREATE INDEX IF NOT EXISTS idx_logs_target ON logs(target_player)`,
      `CREATE INDEX IF NOT EXISTS idx_logs_server ON logs(server_id)`,
      `CREATE INDEX IF NOT EXISTS idx_logs_item_uid ON logs(item_uid)`,
      `CREATE TABLE IF NOT EXISTS economy_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total_money REAL NOT NULL DEFAULT 0,
        player_count INTEGER NOT NULL DEFAULT 0,
        avg_money REAL NOT NULL DEFAULT 0,
        median_money REAL DEFAULT 0,
        top_balances TEXT,
        timestamp INTEGER NOT NULL,
        server_id TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_economy_snapshots_ts ON economy_snapshots(timestamp)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_server ON sessions(server_id)`,
      `CREATE INDEX IF NOT EXISTS idx_casino_player ON casino_transactions(player_uuid)`,
      `CREATE INDEX IF NOT EXISTS idx_casino_game ON casino_transactions(game)`,
      `CREATE INDEX IF NOT EXISTS idx_casino_timestamp ON casino_transactions(timestamp)`,
      `CREATE INDEX IF NOT EXISTS idx_casino_server ON casino_transactions(server_id)`,
      `CREATE INDEX IF NOT EXISTS idx_commands_server ON commands(server_id)`,
    ]);
  }

  return db;
}

// Helpers
export async function run(db: Client, sql: string, params: unknown[] = []) {
  await db.execute({ sql, args: params as never[] });
}

export async function getOne(db: Client, sql: string, params: unknown[] = []): Promise<Record<string, unknown> | null> {
  const result = await db.execute({ sql, args: params as never[] });
  if (result.rows.length === 0) return null;
  return rowToRecord(result.rows[0]);
}

export async function getAll(db: Client, sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
  const result = await db.execute({ sql, args: params as never[] });
  return result.rows.map(rowToRecord);
}

function rowToRecord(row: Row): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    if (key !== "length" && isNaN(Number(key))) {
      record[key] = (row as Record<string, unknown>)[key];
    }
  }
  return record;
}

export async function upsertServer(db: Client, serverId: string, serverName?: string) {
  if (!serverId) return;
  const now = Date.now();
  await run(db, `INSERT INTO servers (server_id, server_name, first_seen, last_seen) VALUES (?, ?, ?, ?)
    ON CONFLICT(server_id) DO UPDATE SET server_name = excluded.server_name, last_seen = excluded.last_seen`,
    [serverId, serverName || serverId, now, now]);
}

export function serverFilter(queryParam: string | null, prefix = "") {
  const col = prefix ? `${prefix}.server_id` : "server_id";
  if (!queryParam || queryParam === "all") return { where: "", params: [] as unknown[] };
  return { where: `${col} = ?`, params: [queryParam] as unknown[] };
}
