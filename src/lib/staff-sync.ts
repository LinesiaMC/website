import { randomBytes } from "crypto";
import { getDb, getOne, run } from "./analytics-db";
import { ingameRankToStaffRole, INGAME_RANK_LABELS, IngameRank } from "./roles";
import { cacheInvalidate } from "./query-cache";
import { invalidateStaffExtrasCache } from "./permissions";

// Read-cache prefixes that go stale when a staff row appears/disappears
// (staff dashboard aggregates, staff lists, stats overview).
const STAFF_INVALIDATE_PREFIXES = ["staff/", "stats/", "auth/"];

/**
 * Source-of-truth for staff status: the in-game server.
 *
 * When a player-profile push arrives with an in-game rank that maps to a
 * staff role, we upsert a staff_users row with source='ingame'. When the
 * same player is later seen with a non-staff rank, we delete that row.
 *
 * We never touch rows with source='manual' — those are managed by humans
 * via /admin/staff. A linked player can have BOTH (manual row first, then
 * an ingame row promoted them); we resolve via xuid + source priority.
 */

function recordAudit(actor: string, action: string, target: string | null, detail: string | null): void {
  // Best-effort audit; never crash a sync if it fails.
  void (async () => {
    try {
      const db = await getDb();
      await run(db,
        "INSERT INTO staff_audit (actor, action, target, detail, timestamp) VALUES (?,?,?,?,?)",
        [actor, action, target, detail, Date.now()]);
    } catch (e) {
      console.error("[staff-sync] audit log failed", e);
    }
  })();
}

export async function syncStaffFromIngame(params: {
  xuid: string;
  uuid: string | null;
  username: string;
  ingameRank: string | null;
}): Promise<void> {
  const { xuid, uuid, username, ingameRank } = params;
  if (!xuid) return;

  const targetRole = ingameRankToStaffRole(ingameRank);
  const db = await getDb();

  // Try to resolve a linked website account (player_accounts.linked_player_uuid
  // contains the xuid because /api/account/link/verify stores xuid there).
  const linked = await getOne(db,
    "SELECT id, microsoft_id, microsoft_gamertag, microsoft_display_name, discord_id FROM player_accounts WHERE linked_player_uuid = ?",
    [xuid]);

  // Existing ingame-sourced staff row for this xuid?
  const existingIngame = await getOne(db,
    "SELECT id, role, ingame_rank FROM staff_users WHERE source = 'ingame' AND linked_xuid = ?",
    [xuid]);

  // Find a matching manual staff row — try by microsoft_id, linked_xuid, or
  // the linked player account's discord_id. This lets a Discord-only founder
  // row get auto-merged with their Microsoft identity on first ingame sync.
  let manualRow: Record<string, unknown> | null = null;
  if (linked?.microsoft_id) {
    manualRow = await getOne(db, "SELECT id, role, microsoft_id, linked_xuid FROM staff_users WHERE source = 'manual' AND microsoft_id = ?", [linked.microsoft_id]);
  }
  if (!manualRow) {
    manualRow = await getOne(db, "SELECT id, role, microsoft_id, linked_xuid FROM staff_users WHERE source = 'manual' AND linked_xuid = ?", [xuid]);
  }
  if (!manualRow && linked?.discord_id) {
    manualRow = await getOne(db, "SELECT id, role, microsoft_id, linked_xuid FROM staff_users WHERE source = 'manual' AND discord_id = ?", [linked.discord_id]);
  }

  // CASE 1: rank is non-staff → ensure no ingame staff row remains.
  if (!targetRole) {
    if (existingIngame) {
      const exId = String(existingIngame.id);
      await run(db, "DELETE FROM staff_sessions WHERE staff_id = ?", [exId]);
      await run(db, "DELETE FROM staff_extra_permissions WHERE staff_id = ?", [exId]);
      await run(db, "DELETE FROM staff_users WHERE id = ?", [exId]);
      recordAudit("ingame-sync", "staff.demote", exId,
        `${username} (xuid=${xuid}) lost staff role (was ${existingIngame.role}, now rank=${ingameRank ?? "none"})`);
      invalidateStaffExtrasCache(exId);
      cacheInvalidate(STAFF_INVALIDATE_PREFIXES);
    }
    return;
  }

  // CASE 2: rank IS staff. If a manual row already exists, fill in any
  // missing Microsoft identity + xuid so the row is the single source of
  // truth for this staff member (no duplicate ingame row).
  if (manualRow) {
    const msId = (manualRow.microsoft_id as string | null) || (linked?.microsoft_id as string | null) || null;
    const msGamertag = (linked?.microsoft_gamertag as string) || username;
    const msDisplayName = (linked?.microsoft_display_name as string) || username;
    await run(db,
      `UPDATE staff_users
         SET ingame_rank = ?,
             linked_xuid = ?,
             microsoft_id = COALESCE(microsoft_id, ?),
             microsoft_gamertag = COALESCE(microsoft_gamertag, ?),
             microsoft_display_name = COALESCE(microsoft_display_name, ?)
         WHERE id = ?`,
      [ingameRank, xuid, msId, msGamertag, msDisplayName, manualRow.id]);
    // If a separate ingame-sourced row was previously created for this xuid,
    // drop it now that the manual row owns the identity.
    if (existingIngame) {
      const exId = String(existingIngame.id);
      await run(db, "DELETE FROM staff_sessions WHERE staff_id = ?", [exId]);
      await run(db, "DELETE FROM staff_extra_permissions WHERE staff_id = ?", [exId]);
      await run(db, "DELETE FROM staff_users WHERE id = ?", [exId]);
      invalidateStaffExtrasCache(exId);
      cacheInvalidate(STAFF_INVALIDATE_PREFIXES);
    }
    return;
  }

  // CASE 3: upsert ingame-sourced row.
  const microsoftId = (linked?.microsoft_id as string) || null;
  const microsoftGamertag = (linked?.microsoft_gamertag as string) || username;
  const microsoftDisplayName = (linked?.microsoft_display_name as string) || username;

  if (existingIngame) {
    if (existingIngame.role !== targetRole) {
      await run(db,
        "UPDATE staff_users SET role = ?, ingame_rank = ?, microsoft_gamertag = COALESCE(microsoft_gamertag, ?) WHERE id = ?",
        [targetRole, ingameRank, microsoftGamertag, existingIngame.id]);
      recordAudit("ingame-sync", "staff.role-change",
        String(existingIngame.id),
        `${username} role: ${existingIngame.role} → ${targetRole} (rank=${ingameRank})`);
      cacheInvalidate(STAFF_INVALIDATE_PREFIXES);
    } else {
      await run(db,
        "UPDATE staff_users SET ingame_rank = ? WHERE id = ?",
        [ingameRank, existingIngame.id]);
    }
    return;
  }

  // Create a new ingame-sourced staff row. Discord uniqueness isn't a concern
  // here (column is null). Microsoft uniqueness: only set if the player has
  // actually linked their MS account; otherwise leave null to avoid collisions.
  const id = Date.now().toString(36) + randomBytes(3).toString("hex");
  await run(db,
    `INSERT INTO staff_users (id, discord_id, discord_username, discord_avatar,
       microsoft_id, microsoft_gamertag, microsoft_display_name,
       display_name, role, created_at, source, ingame_rank, linked_xuid)
     VALUES (?, NULL, NULL, NULL, ?, ?, ?, ?, ?, ?, 'ingame', ?, ?)`,
    [id, microsoftId, microsoftGamertag, microsoftDisplayName, username, targetRole, Date.now(), ingameRank, xuid]);
  recordAudit("ingame-sync", "staff.promote", id,
    `${username} (xuid=${xuid}) promoted to ${targetRole} (rank=${ingameRank})`);
  cacheInvalidate(STAFF_INVALIDATE_PREFIXES);
}

export function ingameRankInfo(rank: string | null | undefined) {
  if (!rank) return null;
  return INGAME_RANK_LABELS[rank.toLowerCase() as IngameRank] ?? null;
}
