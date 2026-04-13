import { createClient, type Client, type Row } from "@libsql/client";

let client: Client | null = null;

function getClient(): Client {
  if (client) return client;

  // Accept either a Turso URL (libsql://...) or a local SQLite file
  // (file:./data/linesia.db) via TURSO_DATABASE_URL. A dedicated
  // DATABASE_URL env is also honored so "VPS with local SQLite" installs
  // don't have to pretend they use Turso.
  const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error("DATABASE_URL or TURSO_DATABASE_URL must be set");
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
      `CREATE TABLE IF NOT EXISTS staff_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id TEXT NOT NULL,
        staff_name TEXT NOT NULL,
        action TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'discord',
        target TEXT,
        detail TEXT,
        timestamp INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_staff_actions_staff ON staff_actions(staff_id)`,
      `CREATE INDEX IF NOT EXISTS idx_staff_actions_action ON staff_actions(action)`,
      `CREATE INDEX IF NOT EXISTS idx_staff_actions_timestamp ON staff_actions(timestamp)`,
      `CREATE INDEX IF NOT EXISTS idx_staff_actions_source ON staff_actions(source)`,
      `CREATE TABLE IF NOT EXISTS sanctions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_uuid TEXT NOT NULL,
        player_name TEXT,
        xuid TEXT,
        type TEXT NOT NULL,
        reason TEXT,
        staff TEXT,
        duration TEXT,
        timestamp INTEGER NOT NULL,
        server_id TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_sanctions_player ON sanctions(player_uuid)`,
      `CREATE INDEX IF NOT EXISTS idx_sanctions_xuid ON sanctions(xuid)`,
      `CREATE INDEX IF NOT EXISTS idx_sanctions_timestamp ON sanctions(timestamp)`,
      `CREATE TABLE IF NOT EXISTS player_aliases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_uuid TEXT NOT NULL,
        player_name TEXT NOT NULL,
        alias_uuid TEXT NOT NULL,
        alias_name TEXT NOT NULL,
        alias_xuid TEXT,
        match_via TEXT,
        updated_at INTEGER NOT NULL,
        UNIQUE(player_uuid, alias_uuid)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_player_aliases_player ON player_aliases(player_uuid)`,
      `CREATE INDEX IF NOT EXISTS idx_player_aliases_alias ON player_aliases(alias_uuid)`,

      // --- Articles (news) ---
      `CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        excerpt TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        date TEXT NOT NULL,
        locale TEXT NOT NULL DEFAULT 'fr'
      )`,
      `CREATE INDEX IF NOT EXISTS idx_articles_locale ON articles(locale)`,
      `CREATE INDEX IF NOT EXISTS idx_articles_date ON articles(date)`,

      // --- Wiki pages ---
      `CREATE TABLE IF NOT EXISTS wiki_pages (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        icon TEXT NOT NULL DEFAULT '',
        parent_id TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE INDEX IF NOT EXISTS idx_wiki_pages_slug ON wiki_pages(slug)`,
      `CREATE INDEX IF NOT EXISTS idx_wiki_pages_parent ON wiki_pages(parent_id)`,

      // --- Roadmap entries (upcoming versions / features) ---
      `CREATE TABLE IF NOT EXISTS roadmap_entries (
        id TEXT PRIMARY KEY,
        version TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'planned',
        date TEXT NOT NULL DEFAULT '',
        locale TEXT NOT NULL DEFAULT 'fr',
        items TEXT NOT NULL DEFAULT '[]',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_roadmap_locale ON roadmap_entries(locale)`,
      `CREATE INDEX IF NOT EXISTS idx_roadmap_status ON roadmap_entries(status)`,
      `CREATE INDEX IF NOT EXISTS idx_roadmap_sort ON roadmap_entries(sort_order)`,

      // --- Staff users (Discord + Microsoft OAuth, both optional) ---
      `CREATE TABLE IF NOT EXISTS staff_users (
        id TEXT PRIMARY KEY,
        discord_id TEXT UNIQUE,
        discord_username TEXT,
        discord_avatar TEXT,
        microsoft_id TEXT UNIQUE,
        microsoft_gamertag TEXT,
        microsoft_display_name TEXT,
        display_name TEXT,
        role TEXT NOT NULL DEFAULT 'guide',
        created_at INTEGER NOT NULL,
        last_login INTEGER
      )`,
      `CREATE INDEX IF NOT EXISTS idx_staff_users_discord ON staff_users(discord_id)`,
      `CREATE INDEX IF NOT EXISTS idx_staff_users_microsoft ON staff_users(microsoft_id)`,

      // --- Staff sessions ---
      `CREATE TABLE IF NOT EXISTS staff_sessions (
        token TEXT PRIMARY KEY,
        staff_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_staff_sessions_staff ON staff_sessions(staff_id)`,
      `CREATE INDEX IF NOT EXISTS idx_staff_sessions_exp ON staff_sessions(expires_at)`,

      // --- Support tickets ---
      `CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        player_name TEXT NOT NULL,
        contact TEXT,
        category TEXT NOT NULL,
        subject TEXT NOT NULL,
        reason TEXT NOT NULL,
        proof TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        assigned_to TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        closed_at INTEGER,
        closed_by TEXT,
        close_reason TEXT,
        close_summary TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)`,
      `CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category)`,
      `CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(code)`,
      `CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at)`,

      `CREATE TABLE IF NOT EXISTS ticket_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id TEXT NOT NULL,
        author_type TEXT NOT NULL,
        author_name TEXT NOT NULL,
        author_role TEXT,
        content TEXT NOT NULL,
        is_internal INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id)`,
      `CREATE INDEX IF NOT EXISTS idx_ticket_messages_created ON ticket_messages(created_at)`,
      `CREATE TABLE IF NOT EXISTS player_profile_extra (
        xuid TEXT PRIMARY KEY,
        uuid TEXT,
        username TEXT,
        rank TEXT,
        prestige INTEGER DEFAULT 0,
        money REAL DEFAULT 0,
        kills INTEGER DEFAULT 0,
        deaths INTEGER DEFAULT 0,
        killstreak INTEGER DEFAULT 0,
        playtime INTEGER DEFAULT 0,
        join_count INTEGER DEFAULT 0,
        first_join TEXT,
        last_leave TEXT,
        jobs TEXT,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_profile_extra_uuid ON player_profile_extra(uuid)`,
      `CREATE TABLE IF NOT EXISTS player_cosmetics (
        xuid TEXT NOT NULL,
        full_id TEXT NOT NULL,
        type TEXT NOT NULL,
        identifier TEXT NOT NULL,
        name TEXT,
        active INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (xuid, full_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_player_cosmetics_xuid ON player_cosmetics(xuid)`,
      `CREATE TABLE IF NOT EXISTS role_permissions (
        role TEXT NOT NULL,
        permission TEXT NOT NULL,
        allowed INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        updated_by TEXT,
        PRIMARY KEY (role, permission)
      )`,
      `CREATE TABLE IF NOT EXISTS staff_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        target TEXT,
        detail TEXT,
        timestamp INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_staff_audit_ts ON staff_audit(timestamp)`,
    ]);

    // --- staff_users: source + ingame_rank columns (idempotent) ---
    try {
      const cols = await getAll(db, "PRAGMA table_info(staff_users)");
      const names = new Set(cols.map((c) => c.name as string));
      if (!names.has("source")) {
        await run(db, "ALTER TABLE staff_users ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'");
      }
      if (!names.has("ingame_rank")) {
        await run(db, "ALTER TABLE staff_users ADD COLUMN ingame_rank TEXT");
      }
      if (!names.has("linked_xuid")) {
        await run(db, "ALTER TABLE staff_users ADD COLUMN linked_xuid TEXT");
        await run(db, "CREATE INDEX IF NOT EXISTS idx_staff_users_linked_xuid ON staff_users(linked_xuid)");
      }
    } catch (e) {
      console.error("[db] staff_users source migration failed", e);
    }

    // --- players table: add xuid column (idempotent) ---
    try {
      const cols = await getAll(db, "PRAGMA table_info(players)");
      const names = new Set(cols.map((c) => c.name as string));
      if (!names.has("xuid")) {
        await run(db, "ALTER TABLE players ADD COLUMN xuid TEXT");
        await run(db, "CREATE INDEX IF NOT EXISTS idx_players_xuid ON players(xuid)");
      }
    } catch (e) {
      console.error("[db] players.xuid migration failed", e);
    }

    // --- Staff users schema migration (idempotent) ---
    // Adds Microsoft columns + relaxes NOT NULL on discord_* if a legacy
    // schema was created by an older build.
    try {
      const cols = await getAll(db, "PRAGMA table_info(staff_users)");
      const names = new Set(cols.map((c) => c.name as string));
      const addCol = async (name: string, type: string) => {
        if (!names.has(name)) {
          await run(db, `ALTER TABLE staff_users ADD COLUMN ${name} ${type}`);
        }
      };
      await addCol("microsoft_id", "TEXT");
      await addCol("microsoft_gamertag", "TEXT");
      await addCol("microsoft_display_name", "TEXT");

      const discordCol = cols.find((c) => c.name === "discord_id");
      const discordUser = cols.find((c) => c.name === "discord_username");
      const needsRebuild =
        (discordCol && Number(discordCol.notnull) === 1) ||
        (discordUser && Number(discordUser.notnull) === 1);
      if (needsRebuild) {
        await db.batch([
          `ALTER TABLE staff_users RENAME TO staff_users_legacy`,
          `CREATE TABLE staff_users (
            id TEXT PRIMARY KEY,
            discord_id TEXT UNIQUE,
            discord_username TEXT,
            discord_avatar TEXT,
            microsoft_id TEXT UNIQUE,
            microsoft_gamertag TEXT,
            microsoft_display_name TEXT,
            display_name TEXT,
            role TEXT NOT NULL DEFAULT 'guide',
            created_at INTEGER NOT NULL,
            last_login INTEGER
          )`,
          `INSERT INTO staff_users (id, discord_id, discord_username, discord_avatar, microsoft_id, microsoft_gamertag, microsoft_display_name, display_name, role, created_at, last_login)
           SELECT id, discord_id, discord_username, discord_avatar,
                  COALESCE(microsoft_id, NULL), COALESCE(microsoft_gamertag, NULL), COALESCE(microsoft_display_name, NULL),
                  display_name, role, created_at, last_login
           FROM staff_users_legacy`,
          `DROP TABLE staff_users_legacy`,
          `CREATE INDEX IF NOT EXISTS idx_staff_users_discord ON staff_users(discord_id)`,
          `CREATE INDEX IF NOT EXISTS idx_staff_users_microsoft ON staff_users(microsoft_id)`,
        ]);
      }
    } catch (e) {
      console.error("[db] staff_users migration failed", e);
    }
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
