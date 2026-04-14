import { randomBytes } from "crypto";
import { getDb, getOne, getAll, run } from "./analytics-db";
import type { PlayerAccount } from "./player-auth";

const REFERRAL_WINDOW_MS = 24 * 60 * 60 * 1000;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

let schemaReady = false;

export async function ensureReferralSchema(): Promise<void> {
  if (schemaReady) return;
  const db = await getDb();
  await db.batch([
    `CREATE TABLE IF NOT EXISTS referral_codes (
      code TEXT PRIMARY KEY,
      owner_account_id TEXT NOT NULL,
      owner_xuid TEXT,
      owner_name TEXT,
      created_at INTEGER NOT NULL,
      uses_count INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_codes_owner ON referral_codes(owner_account_id)`,
    `CREATE INDEX IF NOT EXISTS idx_referral_codes_xuid ON referral_codes(owner_xuid)`,
    `CREATE TABLE IF NOT EXISTS referral_uses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      referrer_account_id TEXT NOT NULL,
      referrer_xuid TEXT,
      referrer_name TEXT,
      referred_account_id TEXT,
      referred_xuid TEXT NOT NULL,
      referred_name TEXT,
      used_at INTEGER NOT NULL,
      referrer_delivered INTEGER NOT NULL DEFAULT 0,
      referred_delivered INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_uses_referred ON referral_uses(referred_xuid)`,
    `CREATE INDEX IF NOT EXISTS idx_referral_uses_code ON referral_uses(code)`,
    `CREATE INDEX IF NOT EXISTS idx_referral_uses_referrer ON referral_uses(referrer_account_id)`,
  ]);
  schemaReady = true;
}

function generateCode(): string {
  const buf = randomBytes(6);
  let out = "";
  for (let i = 0; i < 6; i++) out += CODE_ALPHABET[buf[i] % CODE_ALPHABET.length];
  return out;
}

export interface ReferralCode {
  code: string;
  ownerAccountId: string;
  ownerXuid: string | null;
  ownerName: string | null;
  createdAt: number;
  usesCount: number;
}

export async function getOrCreateReferralCode(account: PlayerAccount): Promise<ReferralCode> {
  await ensureReferralSchema();
  const db = await getDb();
  const existing = await getOne(db, "SELECT * FROM referral_codes WHERE owner_account_id = ?", [account.id]);
  if (existing) {
    if (account.linkedPlayerUuid && !existing.owner_xuid) {
      await run(db,
        "UPDATE referral_codes SET owner_xuid = ?, owner_name = ? WHERE owner_account_id = ?",
        [account.linkedPlayerUuid, account.linkedPlayerName, account.id]);
      existing.owner_xuid = account.linkedPlayerUuid;
      existing.owner_name = account.linkedPlayerName;
    }
    return rowToCode(existing);
  }
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateCode();
    try {
      const now = Date.now();
      await run(db,
        `INSERT INTO referral_codes (code, owner_account_id, owner_xuid, owner_name, created_at, uses_count)
         VALUES (?, ?, ?, ?, ?, 0)`,
        [code, account.id, account.linkedPlayerUuid, account.linkedPlayerName, now]);
      return {
        code,
        ownerAccountId: account.id,
        ownerXuid: account.linkedPlayerUuid,
        ownerName: account.linkedPlayerName,
        createdAt: now,
        usesCount: 0,
      };
    } catch {
      // unique collision, retry
    }
  }
  throw new Error("referral_code_generation_failed");
}

function rowToCode(r: Record<string, unknown>): ReferralCode {
  return {
    code: r.code as string,
    ownerAccountId: r.owner_account_id as string,
    ownerXuid: (r.owner_xuid as string) || null,
    ownerName: (r.owner_name as string) || null,
    createdAt: r.created_at as number,
    usesCount: (r.uses_count as number) || 0,
  };
}

export async function getReferralByCode(code: string): Promise<ReferralCode | null> {
  await ensureReferralSchema();
  const db = await getDb();
  const r = await getOne(db, "SELECT * FROM referral_codes WHERE code = ?", [code.toUpperCase()]);
  return r ? rowToCode(r) : null;
}

export interface ReferralUsePublic {
  referredName: string | null;
  usedAt: number;
}

export async function getReferralUses(ownerAccountId: string): Promise<ReferralUsePublic[]> {
  await ensureReferralSchema();
  const db = await getDb();
  const rows = await getAll(db,
    "SELECT referred_name, used_at FROM referral_uses WHERE referrer_account_id = ? ORDER BY used_at DESC LIMIT 100",
    [ownerAccountId]);
  return rows.map((r) => ({
    referredName: (r.referred_name as string) || null,
    usedAt: r.used_at as number,
  }));
}

export interface TopReferrer {
  name: string;
  xuid: string | null;
  code: string;
  count: number;
}

export async function getTopReferrers(limit = 50): Promise<TopReferrer[]> {
  await ensureReferralSchema();
  const db = await getDb();
  const rows = await getAll(db,
    `SELECT c.code as code, c.uses_count as count, c.owner_xuid as xuid,
            COALESCE(c.owner_name, a.linked_player_name, a.microsoft_gamertag) as name
     FROM referral_codes c
     LEFT JOIN player_accounts a ON a.id = c.owner_account_id
     WHERE c.uses_count > 0
     ORDER BY c.uses_count DESC, c.created_at ASC
     LIMIT ?`,
    [limit]);
  return rows.map((r) => ({
    name: (r.name as string) || "?",
    xuid: (r.xuid as string) || null,
    code: r.code as string,
    count: Number(r.count) || 0,
  }));
}

export interface ClaimAttempt {
  code: string;
  referredXuid: string;
  referredName: string;
  firstJoinAt: number;
}

export type ClaimResult =
  | { ok: false; error: "invalid_code" | "self" | "already_used" | "too_late" | "not_eligible" }
  | {
      ok: true;
      referrerXuid: string | null;
      referrerName: string | null;
      referrerAccountId: string;
      useId: number;
    };

export async function claimReferral(a: ClaimAttempt): Promise<ClaimResult> {
  await ensureReferralSchema();
  const db = await getDb();
  const now = Date.now();

  if (a.firstJoinAt > 0 && now - a.firstJoinAt > REFERRAL_WINDOW_MS) {
    return { ok: false, error: "too_late" };
  }

  const existing = await getOne(db, "SELECT id FROM referral_uses WHERE referred_xuid = ?", [a.referredXuid]);
  if (existing) return { ok: false, error: "already_used" };

  const rc = await getReferralByCode(a.code);
  if (!rc) return { ok: false, error: "invalid_code" };

  if (rc.ownerXuid && rc.ownerXuid === a.referredXuid) return { ok: false, error: "self" };

  const referredAccount = await getOne(db,
    "SELECT id FROM player_accounts WHERE linked_player_uuid = ? LIMIT 1", [a.referredXuid]);
  if (referredAccount && referredAccount.id === rc.ownerAccountId) return { ok: false, error: "self" };

  await run(db,
    `INSERT INTO referral_uses
     (code, referrer_account_id, referrer_xuid, referrer_name, referred_account_id, referred_xuid, referred_name, used_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [rc.code, rc.ownerAccountId, rc.ownerXuid, rc.ownerName,
     referredAccount ? referredAccount.id : null, a.referredXuid, a.referredName, now]);
  await run(db, "UPDATE referral_codes SET uses_count = uses_count + 1 WHERE code = ?", [rc.code]);

  const useRow = await getOne(db,
    "SELECT id FROM referral_uses WHERE referred_xuid = ? ORDER BY id DESC LIMIT 1", [a.referredXuid]);
  const useId = useRow ? Number(useRow.id) : 0;

  return {
    ok: true,
    referrerXuid: rc.ownerXuid,
    referrerName: rc.ownerName,
    referrerAccountId: rc.ownerAccountId,
    useId,
  };
}

export async function markDelivered(useId: number, side: "referrer" | "referred"): Promise<void> {
  await ensureReferralSchema();
  const db = await getDb();
  const col = side === "referrer" ? "referrer_delivered" : "referred_delivered";
  await run(db, `UPDATE referral_uses SET ${col} = 1 WHERE id = ?`, [useId]);
}
