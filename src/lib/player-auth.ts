import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getDb, getOne, run } from "./analytics-db";

export const PLAYER_SESSION_COOKIE = "linesia_player_session";
const SESSION_TTL_DAYS = 30;
const LINK_CODE_TTL_MS = 15 * 60 * 1000;

export interface PlayerAccount {
  id: string;
  microsoftId: string | null;
  microsoftGamertag: string | null;
  microsoftDisplayName: string | null;
  discordId: string | null;
  discordUsername: string | null;
  discordAvatar: string | null;
  linkedPlayerUuid: string | null;
  linkedPlayerName: string | null;
  linkCode: string | null;
  linkCodeExpires: number | null;
  displayName: string | null;
  createdAt: number;
  lastLogin: number | null;
}

function rowToAccount(row: Record<string, unknown>): PlayerAccount {
  return {
    id: row.id as string,
    microsoftId: (row.microsoft_id as string) || null,
    microsoftGamertag: (row.microsoft_gamertag as string) || null,
    microsoftDisplayName: (row.microsoft_display_name as string) || null,
    discordId: (row.discord_id as string) || null,
    discordUsername: (row.discord_username as string) || null,
    discordAvatar: (row.discord_avatar as string) || null,
    linkedPlayerUuid: (row.linked_player_uuid as string) || null,
    linkedPlayerName: (row.linked_player_name as string) || null,
    linkCode: (row.link_code as string) || null,
    linkCodeExpires: (row.link_code_expires as number) || null,
    displayName: (row.display_name as string) || null,
    createdAt: row.created_at as number,
    lastLogin: (row.last_login as number) || null,
  };
}

export async function ensureSchema(): Promise<void> {
  const db = await getDb();
  await db.batch([
    `CREATE TABLE IF NOT EXISTS player_accounts (
      id TEXT PRIMARY KEY,
      microsoft_id TEXT UNIQUE,
      microsoft_gamertag TEXT,
      microsoft_display_name TEXT,
      linked_player_uuid TEXT,
      linked_player_name TEXT,
      link_code TEXT,
      link_code_expires INTEGER,
      display_name TEXT,
      created_at INTEGER NOT NULL,
      last_login INTEGER
    )`,
    `CREATE INDEX IF NOT EXISTS idx_player_accounts_ms ON player_accounts(microsoft_id)`,
    `CREATE INDEX IF NOT EXISTS idx_player_accounts_uuid ON player_accounts(linked_player_uuid)`,
    `CREATE INDEX IF NOT EXISTS idx_player_accounts_code ON player_accounts(link_code)`,
    `CREATE TABLE IF NOT EXISTS player_sessions (
      token TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_player_sessions_acc ON player_sessions(account_id)`,
    `CREATE INDEX IF NOT EXISTS idx_player_sessions_exp ON player_sessions(expires_at)`,
  ]);
  // Idempotent column additions for Discord multi-identity link.
  try {
    const cols = await db.execute("PRAGMA table_info(player_accounts)");
    const names = new Set(cols.rows.map((r) => r.name as string));
    if (!names.has("discord_id")) {
      await run(db, "ALTER TABLE player_accounts ADD COLUMN discord_id TEXT");
      await run(db, "CREATE UNIQUE INDEX IF NOT EXISTS idx_player_accounts_discord ON player_accounts(discord_id)");
    }
    if (!names.has("discord_username")) {
      await run(db, "ALTER TABLE player_accounts ADD COLUMN discord_username TEXT");
    }
    if (!names.has("discord_avatar")) {
      await run(db, "ALTER TABLE player_accounts ADD COLUMN discord_avatar TEXT");
    }
  } catch (e) {
    console.error("[db] player_accounts discord migration failed", e);
  }
}

export async function getAccountById(id: string): Promise<PlayerAccount | null> {
  await ensureSchema();
  const db = await getDb();
  const row = await getOne(db, "SELECT * FROM player_accounts WHERE id = ?", [id]);
  return row ? rowToAccount(row) : null;
}

export async function getAccountByMicrosoftId(msId: string): Promise<PlayerAccount | null> {
  await ensureSchema();
  const db = await getDb();
  const row = await getOne(db, "SELECT * FROM player_accounts WHERE microsoft_id = ?", [msId]);
  return row ? rowToAccount(row) : null;
}

export async function getAccountByLinkCode(code: string): Promise<PlayerAccount | null> {
  await ensureSchema();
  const db = await getDb();
  const row = await getOne(db,
    "SELECT * FROM player_accounts WHERE link_code = ? AND link_code_expires > ?",
    [code.toUpperCase(), Date.now()]);
  return row ? rowToAccount(row) : null;
}

export interface CreateAccountInput {
  microsoftId?: string | null;
  microsoftGamertag?: string | null;
  microsoftDisplayName?: string | null;
  displayName?: string | null;
}

export async function createAccount(data: CreateAccountInput): Promise<PlayerAccount> {
  await ensureSchema();
  const db = await getDb();
  const id = Date.now().toString(36) + randomBytes(3).toString("hex");
  const now = Date.now();
  await run(db,
    `INSERT INTO player_accounts (id, microsoft_id, microsoft_gamertag, microsoft_display_name, display_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, data.microsoftId ?? null, data.microsoftGamertag ?? null,
      data.microsoftDisplayName ?? null, data.displayName ?? null, now]);
  return {
    id, microsoftId: data.microsoftId ?? null,
    microsoftGamertag: data.microsoftGamertag ?? null,
    microsoftDisplayName: data.microsoftDisplayName ?? null,
    discordId: null, discordUsername: null, discordAvatar: null,
    linkedPlayerUuid: null, linkedPlayerName: null,
    linkCode: null, linkCodeExpires: null,
    displayName: data.displayName ?? null,
    createdAt: now, lastLogin: null,
  };
}

export async function tryAutoLinkByGamertag(accountId: string, gamertag: string): Promise<{ uuid: string; name: string } | null> {
  if (!gamertag) return null;
  const db = await getDb();
  const row = await getOne(db, "SELECT uuid, username FROM players WHERE username = ? COLLATE NOCASE LIMIT 1", [gamertag]);
  if (!row) return null;
  const uuid = row.uuid as string, name = row.username as string;
  await run(db,
    "UPDATE player_accounts SET linked_player_uuid = ?, linked_player_name = ? WHERE id = ?",
    [uuid, name, accountId]);
  return { uuid, name };
}

export async function getAccountByDiscordId(discordId: string): Promise<PlayerAccount | null> {
  await ensureSchema();
  const db = await getDb();
  const row = await getOne(db, "SELECT * FROM player_accounts WHERE discord_id = ?", [discordId]);
  return row ? rowToAccount(row) : null;
}

export async function updateAccountDiscord(id: string, discord: {
  discordId: string; discordUsername: string; discordAvatar: string | null;
}): Promise<void> {
  const db = await getDb();
  await run(db,
    "UPDATE player_accounts SET discord_id = ?, discord_username = ?, discord_avatar = ? WHERE id = ?",
    [discord.discordId, discord.discordUsername, discord.discordAvatar, id]);
}

export async function unlinkAccountDiscord(id: string): Promise<void> {
  const db = await getDb();
  await run(db,
    "UPDATE player_accounts SET discord_id = NULL, discord_username = NULL, discord_avatar = NULL WHERE id = ?",
    [id]);
}

export async function updateAccountMicrosoft(id: string, gamertag: string, displayName: string): Promise<void> {
  const db = await getDb();
  await run(db,
    "UPDATE player_accounts SET microsoft_gamertag = ?, microsoft_display_name = ? WHERE id = ?",
    [gamertag, displayName, id]);
}

export async function setLinkCode(accountId: string, pseudo: string): Promise<string> {
  await ensureSchema();
  const db = await getDb();
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const buf = randomBytes(6);
  for (let i = 0; i < 6; i++) code += alphabet[buf[i] % alphabet.length];
  const expires = Date.now() + LINK_CODE_TTL_MS;
  await run(db,
    "UPDATE player_accounts SET link_code = ?, link_code_expires = ?, linked_player_name = ? WHERE id = ?",
    [code, expires, pseudo, accountId]);
  return code;
}

export async function confirmLink(accountId: string, uuid: string, name: string): Promise<void> {
  const db = await getDb();
  await run(db,
    "UPDATE player_accounts SET linked_player_uuid = ?, linked_player_name = ?, link_code = NULL, link_code_expires = NULL WHERE id = ?",
    [uuid, name, accountId]);
}

export async function unlinkPlayer(accountId: string): Promise<void> {
  const db = await getDb();
  await run(db,
    "UPDATE player_accounts SET linked_player_uuid = NULL, linked_player_name = NULL WHERE id = ?",
    [accountId]);
}

export async function touchLastLogin(id: string): Promise<void> {
  const db = await getDb();
  await run(db, "UPDATE player_accounts SET last_login = ? WHERE id = ?", [Date.now(), id]);
}

export async function createPlayerSession(accountId: string): Promise<{ token: string; expiresAt: number }> {
  await ensureSchema();
  const db = await getDb();
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_DAYS * 24 * 3600 * 1000;
  await run(db,
    "INSERT INTO player_sessions (token, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    [token, accountId, now, expiresAt]);
  return { token, expiresAt };
}

export async function deletePlayerSession(token: string): Promise<void> {
  const db = await getDb();
  await run(db, "DELETE FROM player_sessions WHERE token = ?", [token]);
}

export async function getSessionAccount(token: string): Promise<PlayerAccount | null> {
  await ensureSchema();
  const db = await getDb();
  const row = await getOne(db,
    `SELECT a.* FROM player_sessions s JOIN player_accounts a ON a.id = s.account_id
     WHERE s.token = ? AND s.expires_at > ?`,
    [token, Date.now()]);
  return row ? rowToAccount(row) : null;
}

export async function getCurrentAccount(req?: NextRequest): Promise<PlayerAccount | null> {
  let token: string | undefined;
  if (req) token = req.cookies.get(PLAYER_SESSION_COOKIE)?.value;
  else {
    const store = await cookies();
    token = store.get(PLAYER_SESSION_COOKIE)?.value;
  }
  if (!token) return null;
  return getSessionAccount(token);
}

export interface JobInfo { name: string; level: number; xp: number }
export interface CosmeticInfo {
  fullId: string; type: string; identifier: string; name: string | null; active: boolean;
}
export interface ProfileExtra {
  rank: string | null;
  prestige: number;
  kills: number;
  killstreak: number;
  joinCount: number;
  firstJoin: string | null;
  lastLeave: string | null;
  jobs: JobInfo[];
}

export interface PlayerStats {
  uuid: string;
  xuid: string | null;
  username: string;
  platform: string;
  firstSeen: number;
  lastSeen: number;
  totalPlaytime: number;
  sessionCount: number;
  money: number | null;
  casinoNet: number | null;
  deaths: number;
  extra: ProfileExtra | null;
  cosmetics: CosmeticInfo[];
}

export async function getPlayerStats(idOrXuid: string): Promise<PlayerStats | null> {
  const db = await getDb();
  // Accept either the canonical UUID (legacy) or an XUID (used by the
  // /link flow which stores xuid in linked_player_uuid).
  let p = await getOne(db, "SELECT * FROM players WHERE uuid = ?", [idOrXuid]);
  if (!p) p = await getOne(db, "SELECT * FROM players WHERE xuid = ?", [idOrXuid]);
  if (!p) return null;
  const uuid = p.uuid as string;

  const money = await getOne(db,
    `SELECT CAST(detail AS REAL) as m FROM logs
     WHERE player_uuid = ? AND category = 'economy' AND action = 'balance'
     ORDER BY timestamp DESC LIMIT 1`,
    [uuid]);

  const casino = await getOne(db,
    "SELECT COALESCE(SUM(net_result), 0) as net FROM casino_transactions WHERE player_uuid = ?",
    [uuid]);

  const deaths = await getOne(db,
    "SELECT COUNT(*) as c FROM deaths WHERE player_uuid = ?", [uuid]);

  const xuid = (p.xuid as string) || null;

  let extra: ProfileExtra | null = null;
  let cosmetics: CosmeticInfo[] = [];
  if (xuid) {
    const ext = await getOne(db, "SELECT * FROM player_profile_extra WHERE xuid = ?", [xuid]);
    if (ext) {
      let jobs: JobInfo[] = [];
      try {
        const raw = ext.jobs as string | null;
        if (raw) jobs = JSON.parse(raw) as JobInfo[];
      } catch {}
      const moneyExt = Number(ext.money);
      extra = {
        rank: (ext.rank as string) || null,
        prestige: Number(ext.prestige) || 0,
        kills: Number(ext.kills) || 0,
        killstreak: Number(ext.killstreak) || 0,
        joinCount: Number(ext.join_count) || 0,
        firstJoin: (ext.first_join as string) || null,
        lastLeave: (ext.last_leave as string) || null,
        jobs,
      };
      const cosRows = await db.execute({
        sql: "SELECT full_id, type, identifier, name, active FROM player_cosmetics WHERE xuid = ? ORDER BY active DESC, type, name",
        args: [xuid],
      });
      cosmetics = cosRows.rows.map((r) => ({
        fullId: r.full_id as string,
        type: r.type as string,
        identifier: r.identifier as string,
        name: (r.name as string) || null,
        active: Number(r.active) === 1,
      }));
      // Override money/kills/deaths with the more recent ingame-pushed values when present.
      void moneyExt;
    }
  }

  return {
    uuid: p.uuid as string,
    xuid,
    username: p.username as string,
    platform: (p.platform as string) || "Unknown",
    firstSeen: p.first_seen as number,
    lastSeen: p.last_seen as number,
    totalPlaytime: (p.total_playtime as number) || 0,
    sessionCount: (p.session_count as number) || 0,
    money: money ? Number(money.m) || 0 : null,
    casinoNet: casino ? Number(casino.net) : null,
    deaths: (deaths?.c as number) || 0,
    extra,
    cosmetics,
  };
}

export function isPlayerAccount(v: PlayerAccount | NextResponse): v is PlayerAccount {
  return !(v instanceof NextResponse);
}

export async function requirePlayer(req: NextRequest): Promise<PlayerAccount | NextResponse> {
  const acc = await getCurrentAccount(req);
  if (!acc) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return acc;
}
