#!/usr/bin/env node
/**
 * Dump a Turso (libsql) remote database into a local SQLite file.
 *
 * Usage:
 *   TURSO_DATABASE_URL=libsql://...  \
 *   TURSO_AUTH_TOKEN=...              \
 *   LOCAL_DB_PATH=./data/linesia.db   \
 *   node scripts/migrate-turso-to-sqlite.mjs
 *
 * Strategy:
 *  - Connect to the remote libsql database (read-only use).
 *  - Connect to a local file: libsql database at LOCAL_DB_PATH.
 *  - For each known table, stream rows in pages and insert them locally.
 *
 * The destination schema is created by the app on first boot via
 * src/lib/analytics-db.ts (getDb). This script assumes you've already run
 * the app once against the local file OR you can run it here by importing
 * the same init logic — we just issue the CREATE TABLE IF NOT EXISTS
 * statements inline so the script is self-contained.
 */

import { createClient } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
const LOCAL_DB_PATH = process.env.LOCAL_DB_PATH || "./data/linesia.db";

if (!TURSO_URL) {
  console.error("TURSO_DATABASE_URL is required");
  process.exit(1);
}

const localPath = resolve(LOCAL_DB_PATH);
mkdirSync(dirname(localPath), { recursive: true });

console.log(`→ remote : ${TURSO_URL}`);
console.log(`→ local  : file:${localPath}`);

const remote = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
const local = createClient({ url: `file:${localPath}` });

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS servers (server_id TEXT PRIMARY KEY, server_name TEXT NOT NULL, last_seen INTEGER NOT NULL, first_seen INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS players (uuid TEXT PRIMARY KEY, username TEXT NOT NULL, platform TEXT DEFAULT 'Unknown', first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL, total_playtime INTEGER DEFAULT 0, session_count INTEGER DEFAULT 0, ip_address TEXT)`,
  `CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, player_uuid TEXT NOT NULL, join_time INTEGER NOT NULL, leave_time INTEGER, duration INTEGER DEFAULT 0, platform TEXT, server_id TEXT)`,
  `CREATE TABLE IF NOT EXISTS commands (id INTEGER PRIMARY KEY AUTOINCREMENT, player_uuid TEXT NOT NULL, command TEXT NOT NULL, arguments TEXT, world TEXT, timestamp INTEGER NOT NULL, server_id TEXT)`,
  `CREATE TABLE IF NOT EXISTS world_visits (id INTEGER PRIMARY KEY AUTOINCREMENT, player_uuid TEXT NOT NULL, world_name TEXT NOT NULL, enter_time INTEGER NOT NULL, leave_time INTEGER, duration INTEGER DEFAULT 0, server_id TEXT)`,
  `CREATE TABLE IF NOT EXISTS chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, player_uuid TEXT NOT NULL, message TEXT NOT NULL, world TEXT, timestamp INTEGER NOT NULL, server_id TEXT)`,
  `CREATE TABLE IF NOT EXISTS deaths (id INTEGER PRIMARY KEY AUTOINCREMENT, player_uuid TEXT NOT NULL, cause TEXT, world TEXT, x REAL, y REAL, z REAL, timestamp INTEGER NOT NULL, server_id TEXT)`,
  `CREATE TABLE IF NOT EXISTS casino_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, player_uuid TEXT NOT NULL, game TEXT NOT NULL, bet_amount INTEGER NOT NULL DEFAULT 0, win_amount INTEGER NOT NULL DEFAULT 0, net_result INTEGER NOT NULL DEFAULT 0, currency TEXT DEFAULT 'gems', timestamp INTEGER NOT NULL, server_id TEXT)`,
  `CREATE TABLE IF NOT EXISTS block_events (id INTEGER PRIMARY KEY AUTOINCREMENT, player_uuid TEXT NOT NULL, action TEXT NOT NULL, block_id TEXT NOT NULL, world TEXT, x INTEGER, y INTEGER, z INTEGER, timestamp INTEGER NOT NULL, server_id TEXT)`,
  `CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY AUTOINCREMENT, player_uuid TEXT, player_name TEXT, category TEXT NOT NULL, action TEXT NOT NULL, detail TEXT, item_name TEXT, item_count INTEGER, item_uid TEXT, target_player TEXT, world TEXT, x REAL, y REAL, z REAL, level TEXT DEFAULT 'info', timestamp INTEGER NOT NULL, server_id TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_logs_player ON logs(player_name)`,
  `CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category)`,
  `CREATE INDEX IF NOT EXISTS idx_logs_action ON logs(action)`,
  `CREATE INDEX IF NOT EXISTS idx_logs_item ON logs(item_name)`,
  `CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)`,
  `CREATE INDEX IF NOT EXISTS idx_logs_target ON logs(target_player)`,
  `CREATE INDEX IF NOT EXISTS idx_logs_server ON logs(server_id)`,
  `CREATE INDEX IF NOT EXISTS idx_logs_item_uid ON logs(item_uid)`,
  `CREATE TABLE IF NOT EXISTS economy_snapshots (id INTEGER PRIMARY KEY AUTOINCREMENT, total_money REAL NOT NULL DEFAULT 0, player_count INTEGER NOT NULL DEFAULT 0, avg_money REAL NOT NULL DEFAULT 0, median_money REAL DEFAULT 0, top_balances TEXT, timestamp INTEGER NOT NULL, server_id TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_economy_snapshots_ts ON economy_snapshots(timestamp)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_server ON sessions(server_id)`,
  `CREATE INDEX IF NOT EXISTS idx_casino_player ON casino_transactions(player_uuid)`,
  `CREATE INDEX IF NOT EXISTS idx_casino_game ON casino_transactions(game)`,
  `CREATE INDEX IF NOT EXISTS idx_casino_timestamp ON casino_transactions(timestamp)`,
  `CREATE INDEX IF NOT EXISTS idx_casino_server ON casino_transactions(server_id)`,
  `CREATE INDEX IF NOT EXISTS idx_commands_server ON commands(server_id)`,
  `CREATE TABLE IF NOT EXISTS staff_actions (id INTEGER PRIMARY KEY AUTOINCREMENT, staff_id TEXT NOT NULL, staff_name TEXT NOT NULL, action TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'discord', target TEXT, detail TEXT, timestamp INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_staff_actions_staff ON staff_actions(staff_id)`,
  `CREATE INDEX IF NOT EXISTS idx_staff_actions_action ON staff_actions(action)`,
  `CREATE INDEX IF NOT EXISTS idx_staff_actions_timestamp ON staff_actions(timestamp)`,
  `CREATE INDEX IF NOT EXISTS idx_staff_actions_source ON staff_actions(source)`,
  `CREATE TABLE IF NOT EXISTS sanctions (id INTEGER PRIMARY KEY AUTOINCREMENT, player_uuid TEXT NOT NULL, player_name TEXT, xuid TEXT, type TEXT NOT NULL, reason TEXT, staff TEXT, duration TEXT, timestamp INTEGER NOT NULL, server_id TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_sanctions_player ON sanctions(player_uuid)`,
  `CREATE INDEX IF NOT EXISTS idx_sanctions_xuid ON sanctions(xuid)`,
  `CREATE INDEX IF NOT EXISTS idx_sanctions_timestamp ON sanctions(timestamp)`,
  `CREATE TABLE IF NOT EXISTS player_aliases (id INTEGER PRIMARY KEY AUTOINCREMENT, player_uuid TEXT NOT NULL, player_name TEXT NOT NULL, alias_uuid TEXT NOT NULL, alias_name TEXT NOT NULL, alias_xuid TEXT, match_via TEXT, updated_at INTEGER NOT NULL, UNIQUE(player_uuid, alias_uuid))`,
  `CREATE INDEX IF NOT EXISTS idx_player_aliases_player ON player_aliases(player_uuid)`,
  `CREATE INDEX IF NOT EXISTS idx_player_aliases_alias ON player_aliases(alias_uuid)`,
  `CREATE TABLE IF NOT EXISTS articles (id TEXT PRIMARY KEY, title TEXT NOT NULL, excerpt TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '', date TEXT NOT NULL, locale TEXT NOT NULL DEFAULT 'fr')`,
  `CREATE INDEX IF NOT EXISTS idx_articles_locale ON articles(locale)`,
  `CREATE INDEX IF NOT EXISTS idx_articles_date ON articles(date)`,
  `CREATE TABLE IF NOT EXISTS wiki_pages (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, content TEXT NOT NULL DEFAULT '', icon TEXT NOT NULL DEFAULT '', parent_id TEXT, sort_order INTEGER NOT NULL DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS idx_wiki_pages_slug ON wiki_pages(slug)`,
  `CREATE INDEX IF NOT EXISTS idx_wiki_pages_parent ON wiki_pages(parent_id)`,
];

console.log("→ creating local schema");
await local.batch(SCHEMA);

// Order matters only if you care about foreign keys (none defined here).
const TABLES = [
  "servers", "players", "sessions", "commands", "world_visits",
  "chat_messages", "deaths", "casino_transactions", "block_events", "logs",
  "economy_snapshots", "staff_actions", "sanctions", "player_aliases",
  "articles", "wiki_pages",
];

const PAGE = 1000;

for (const table of TABLES) {
  const countRes = await remote.execute(`SELECT COUNT(*) as c FROM ${table}`);
  const total = Number(countRes.rows[0]?.c ?? 0);
  if (total === 0) {
    console.log(`  ${table}: empty`);
    continue;
  }
  console.log(`  ${table}: ${total} rows`);

  // Optional wipe — uncomment for a clean reimport.
  // await local.execute(`DELETE FROM ${table}`);

  let offset = 0;
  while (offset < total) {
    const res = await remote.execute({
      sql: `SELECT * FROM ${table} LIMIT ? OFFSET ?`,
      args: [PAGE, offset],
    });
    if (res.rows.length === 0) break;
    const cols = res.columns;
    const placeholders = cols.map(() => "?").join(",");
    const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(",")}) VALUES (${placeholders})`;
    const stmts = res.rows.map((row) => ({
      sql,
      args: cols.map((c) => row[c]),
    }));
    await local.batch(stmts);
    offset += res.rows.length;
    process.stdout.write(`    ${offset}/${total}\r`);
  }
  process.stdout.write(`    ${total}/${total}\n`);
}

console.log("✓ migration complete");
process.exit(0);
