import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getDb, getAll, getOne, run } from "./analytics-db";
import { StaffRole, Permission } from "./roles";
import { hasPermissionForStaff } from "./permissions";
import { PLAYER_SESSION_COOKIE, getSessionAccount } from "./player-auth";

export const SESSION_COOKIE = "linesia_staff_session";
const SESSION_TTL_DAYS = 30;

export interface StaffUser {
  id: string;
  discordId: string | null;
  discordUsername: string | null;
  discordAvatar: string | null;
  microsoftId: string | null;
  microsoftGamertag: string | null;
  microsoftDisplayName: string | null;
  displayName: string | null;
  role: StaffRole;
  createdAt: number;
  lastLogin: number | null;
}

function rowToStaff(row: Record<string, unknown>): StaffUser {
  return {
    id: row.id as string,
    discordId: (row.discord_id as string) || null,
    discordUsername: (row.discord_username as string) || null,
    discordAvatar: (row.discord_avatar as string) || null,
    microsoftId: (row.microsoft_id as string) || null,
    microsoftGamertag: (row.microsoft_gamertag as string) || null,
    microsoftDisplayName: (row.microsoft_display_name as string) || null,
    displayName: (row.display_name as string) || null,
    role: row.role as StaffRole,
    createdAt: row.created_at as number,
    lastLogin: (row.last_login as number) || null,
  };
}

export async function getStaffById(id: string): Promise<StaffUser | null> {
  const db = await getDb();
  const row = await getOne(db, "SELECT * FROM staff_users WHERE id = ?", [id]);
  return row ? rowToStaff(row) : null;
}

export async function getStaffByDiscordId(discordId: string): Promise<StaffUser | null> {
  const db = await getDb();
  const row = await getOne(db, "SELECT * FROM staff_users WHERE discord_id = ?", [discordId]);
  return row ? rowToStaff(row) : null;
}

export async function getStaffByMicrosoftId(microsoftId: string): Promise<StaffUser | null> {
  const db = await getDb();
  const row = await getOne(db, "SELECT * FROM staff_users WHERE microsoft_id = ?", [microsoftId]);
  return row ? rowToStaff(row) : null;
}

export async function listStaff(): Promise<StaffUser[]> {
  const db = await getDb();
  const rows = await getAll(db, "SELECT * FROM staff_users ORDER BY created_at ASC");
  return rows.map(rowToStaff);
}

export async function countStaff(): Promise<number> {
  const db = await getDb();
  const row = await getOne(db, "SELECT COUNT(*) as c FROM staff_users");
  return (row?.c as number) || 0;
}

export interface CreateStaffInput {
  discordId?: string | null;
  discordUsername?: string | null;
  discordAvatar?: string | null;
  microsoftId?: string | null;
  microsoftGamertag?: string | null;
  microsoftDisplayName?: string | null;
  displayName?: string | null;
  role: StaffRole;
}

export async function createStaff(data: CreateStaffInput): Promise<StaffUser> {
  if (!data.discordId && !data.microsoftId) {
    throw new Error("At least one provider (Discord or Microsoft) is required");
  }
  const db = await getDb();
  const id = Date.now().toString(36) + randomBytes(3).toString("hex");
  const now = Date.now();
  await run(db,
    `INSERT INTO staff_users (id, discord_id, discord_username, discord_avatar,
       microsoft_id, microsoft_gamertag, microsoft_display_name,
       display_name, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.discordId ?? null, data.discordUsername ?? null, data.discordAvatar ?? null,
      data.microsoftId ?? null, data.microsoftGamertag ?? null, data.microsoftDisplayName ?? null,
      data.displayName ?? null, data.role, now],
  );
  return {
    id,
    discordId: data.discordId ?? null,
    discordUsername: data.discordUsername ?? null,
    discordAvatar: data.discordAvatar ?? null,
    microsoftId: data.microsoftId ?? null,
    microsoftGamertag: data.microsoftGamertag ?? null,
    microsoftDisplayName: data.microsoftDisplayName ?? null,
    displayName: data.displayName ?? null,
    role: data.role, createdAt: now, lastLogin: null,
  };
}

export async function updateStaff(id: string, data: Partial<{
  role: StaffRole;
  displayName: string | null;
  discordId: string | null;
  discordUsername: string | null;
  discordAvatar: string | null;
  microsoftId: string | null;
  microsoftGamertag: string | null;
  microsoftDisplayName: string | null;
}>): Promise<StaffUser | null> {
  const db = await getDb();
  const existing = await getStaffById(id);
  if (!existing) return null;
  const merged = { ...existing, ...data };
  await run(db,
    `UPDATE staff_users SET role = ?, display_name = ?,
       discord_id = ?, discord_username = ?, discord_avatar = ?,
       microsoft_id = ?, microsoft_gamertag = ?, microsoft_display_name = ?
     WHERE id = ?`,
    [merged.role, merged.displayName,
      merged.discordId, merged.discordUsername, merged.discordAvatar,
      merged.microsoftId, merged.microsoftGamertag, merged.microsoftDisplayName,
      id],
  );
  return merged;
}

export async function deleteStaff(id: string): Promise<boolean> {
  const db = await getDb();
  await run(db, "DELETE FROM staff_sessions WHERE staff_id = ?", [id]);
  await run(db, "DELETE FROM staff_extra_permissions WHERE staff_id = ?", [id]);
  await run(db, "DELETE FROM staff_users WHERE id = ?", [id]);
  return true;
}

export async function touchLastLogin(id: string): Promise<void> {
  const db = await getDb();
  await run(db, "UPDATE staff_users SET last_login = ? WHERE id = ?", [Date.now(), id]);
}

export async function createSession(staffId: string): Promise<{ token: string; expiresAt: number }> {
  const db = await getDb();
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_DAYS * 24 * 3600 * 1000;
  await run(db, "INSERT INTO staff_sessions (token, staff_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    [token, staffId, now, expiresAt]);
  return { token, expiresAt };
}

export async function deleteSession(token: string): Promise<void> {
  const db = await getDb();
  await run(db, "DELETE FROM staff_sessions WHERE token = ?", [token]);
}

export async function getSessionStaff(token: string): Promise<StaffUser | null> {
  const db = await getDb();
  const row = await getOne(db,
    `SELECT u.* FROM staff_sessions s JOIN staff_users u ON u.id = s.staff_id
     WHERE s.token = ? AND s.expires_at > ?`,
    [token, Date.now()],
  );
  return row ? rowToStaff(row) : null;
}

const DEV_BYPASS_STAFF: StaffUser = {
  id: "local-dev-founder",
  discordId: null,
  discordUsername: null,
  discordAvatar: null,
  microsoftId: null,
  microsoftGamertag: null,
  microsoftDisplayName: null,
  displayName: "Local Dev (founder)",
  role: "founder",
  createdAt: 0,
  lastLogin: null,
};

export async function getCurrentStaff(req?: NextRequest): Promise<StaffUser | null> {
  if (process.env.NODE_ENV === "development") return DEV_BYPASS_STAFF;
  let token: string | undefined;
  let playerToken: string | undefined;
  if (req) {
    token = req.cookies.get(SESSION_COOKIE)?.value;
    playerToken = req.cookies.get(PLAYER_SESSION_COOKIE)?.value;
  } else {
    const store = await cookies();
    token = store.get(SESSION_COOKIE)?.value;
    playerToken = store.get(PLAYER_SESSION_COOKIE)?.value;
  }
  if (token) {
    const staff = await getSessionStaff(token);
    if (staff) return staff;
  }
  if (playerToken) {
    const account = await getSessionAccount(playerToken);
    if (account) {
      const db = await getDb();
      let row: Record<string, unknown> | null = null;
      if (account.linkedPlayerUuid) {
        row = await getOne(db,
          "SELECT * FROM staff_users WHERE linked_xuid = ? ORDER BY source = 'manual' DESC LIMIT 1",
          [account.linkedPlayerUuid]);
      }
      if (!row && account.microsoftId) {
        row = await getOne(db,
          "SELECT * FROM staff_users WHERE microsoft_id = ? ORDER BY source = 'manual' DESC LIMIT 1",
          [account.microsoftId]);
      }
      if (!row && account.discordId) {
        row = await getOne(db,
          "SELECT * FROM staff_users WHERE discord_id = ? ORDER BY source = 'manual' DESC LIMIT 1",
          [account.discordId]);
      }
      if (row) return rowToStaff(row);
    }
  }
  return null;
}

export async function requirePermission(req: NextRequest, perm: Permission): Promise<StaffUser | NextResponse> {
  const staff = await getCurrentStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await hasPermissionForStaff(staff, perm))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return staff;
}

export async function requireAuth(req: NextRequest): Promise<StaffUser | NextResponse> {
  const staff = await getCurrentStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return staff;
}

export function isStaffUser(v: StaffUser | NextResponse): v is StaffUser {
  return !(v instanceof NextResponse);
}
