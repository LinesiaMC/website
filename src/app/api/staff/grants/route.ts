import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requirePermission, isStaffUser } from "@/lib/auth";
import { getDb, getAll, getOne, run } from "@/lib/analytics-db";
import {
  grantStaffExtra, revokeStaffExtra, listAllExtras,
} from "@/lib/permissions";
import { PERMISSIONS, Permission, StaffRole } from "@/lib/roles";

interface StaffRow {
  id: string;
  role: StaffRole;
  source: "manual" | "ingame";
  display_name: string | null;
  microsoft_gamertag: string | null;
  microsoft_display_name: string | null;
  discord_username: string | null;
  linked_xuid: string | null;
  microsoft_id: string | null;
  ingame_rank: string | null;
}

function recordAudit(actor: string, action: string, target: string | null, detail: string | null): void {
  void (async () => {
    try {
      const db = await getDb();
      await run(db,
        "INSERT INTO staff_audit (actor, action, target, detail, timestamp) VALUES (?,?,?,?,?)",
        [actor, action, target, detail, Date.now()]);
    } catch (e) {
      console.error("[grants] audit failed", e);
    }
  })();
}

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "permissions.manage");
  if (!isStaffUser(auth)) return auth;

  const db = await getDb();
  const extras = await listAllExtras();
  const staffIds = Object.keys(extras);

  const rows: StaffRow[] = [];
  if (staffIds.length > 0) {
    const placeholders = staffIds.map(() => "?").join(",");
    const res = await getAll(db,
      `SELECT id, role, source, display_name, microsoft_gamertag, microsoft_display_name,
              discord_username, linked_xuid, microsoft_id, ingame_rank
         FROM staff_users WHERE id IN (${placeholders})`,
      staffIds);
    rows.push(...(res as unknown as StaffRow[]));
  }

  return NextResponse.json({
    grants: rows.map((r) => ({
      staffId: r.id,
      role: r.role,
      source: r.source,
      displayName: r.display_name || r.microsoft_display_name || r.microsoft_gamertag || r.discord_username || r.id,
      gamertag: r.microsoft_gamertag || null,
      xuid: r.linked_xuid || null,
      ingameRank: r.ingame_rank || null,
      permissions: extras[r.id] ?? [],
    })),
  });
}

interface PostBody {
  staffId?: string;
  xuid?: string;
  uuid?: string;
  username?: string;
  permissions?: Permission[];
  permission?: Permission;
}

/**
 * Grants one or more permissions to a specific player.
 * Resolves (or creates) a staff_users row for the target, then stores
 * extras in staff_extra_permissions. If no staff row exists we create a
 * minimal one with role='member' (all defaults false).
 */
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "permissions.manage");
  if (!isStaffUser(auth)) return auth;

  const body = (await req.json().catch(() => ({}))) as PostBody;
  const perms = body.permissions ?? (body.permission ? [body.permission] : []);
  if (perms.length === 0) return NextResponse.json({ error: "no_permissions" }, { status: 400 });
  for (const p of perms) {
    if (!PERMISSIONS.includes(p)) return NextResponse.json({ error: `invalid_permission:${p}` }, { status: 400 });
  }

  const db = await getDb();
  let staffId = body.staffId?.trim() || "";

  if (!staffId) {
    // Resolve by xuid → uuid → username (player must exist in players table).
    let player: Record<string, unknown> | null = null;
    if (body.xuid) player = await getOne(db, "SELECT uuid, xuid, username FROM players WHERE xuid = ? LIMIT 1", [body.xuid]);
    if (!player && body.uuid) player = await getOne(db, "SELECT uuid, xuid, username FROM players WHERE uuid = ? LIMIT 1", [body.uuid]);
    if (!player && body.username) player = await getOne(db, "SELECT uuid, xuid, username FROM players WHERE LOWER(username) = ? LIMIT 1", [body.username.toLowerCase()]);
    if (!player) return NextResponse.json({ error: "player_not_found" }, { status: 404 });

    const xuid = (player.xuid as string | null) || null;
    const uuid = (player.uuid as string | null) || null;
    const username = (player.username as string | null) || null;

    // Check for existing staff row (manual or ingame), preferring manual.
    let existing: Record<string, unknown> | null = null;
    if (xuid) {
      existing = await getOne(db,
        "SELECT id FROM staff_users WHERE linked_xuid = ? ORDER BY source = 'manual' DESC LIMIT 1",
        [xuid]);
    }
    if (!existing && uuid) {
      existing = await getOne(db,
        "SELECT id FROM staff_users WHERE linked_xuid = ? LIMIT 1", [uuid]);
    }

    if (existing) {
      staffId = existing.id as string;
    } else {
      // Create a minimal staff row with role='member' (no baseline perms).
      // Pull any identity details from player_accounts if linked.
      const linked = xuid
        ? await getOne(db,
            "SELECT microsoft_id, microsoft_gamertag, microsoft_display_name, discord_id FROM player_accounts WHERE linked_player_uuid = ? LIMIT 1",
            [xuid])
        : null;

      staffId = Date.now().toString(36) + randomBytes(3).toString("hex");
      await run(db,
        `INSERT INTO staff_users (id, discord_id, discord_username, discord_avatar,
           microsoft_id, microsoft_gamertag, microsoft_display_name,
           display_name, role, created_at, source, ingame_rank, linked_xuid)
         VALUES (?, NULL, NULL, NULL, ?, ?, ?, ?, 'member', ?, 'manual', NULL, ?)`,
        [staffId,
          (linked?.microsoft_id as string | null) || null,
          (linked?.microsoft_gamertag as string | null) || username,
          (linked?.microsoft_display_name as string | null) || username,
          username,
          Date.now(),
          xuid,
        ]);
      recordAudit(auth.id, "grants.create-member",
        staffId, `created member-role staff row for ${username} (xuid=${xuid ?? "none"})`);
    }
  }

  // Founder role is a super-admin; granting extras on top is a no-op but
  // we still allow the INSERT so the UI can reflect intent. Skip instead —
  // simpler to signal invalid state.
  const target = await getOne(db, "SELECT role FROM staff_users WHERE id = ?", [staffId]);
  if (!target) return NextResponse.json({ error: "staff_not_found" }, { status: 404 });
  if ((target.role as StaffRole) === "founder") {
    return NextResponse.json({ error: "founder_has_all_permissions" }, { status: 400 });
  }

  for (const p of perms) {
    await grantStaffExtra(staffId, p, auth.id);
  }
  recordAudit(auth.id, "grants.grant", staffId, `granted ${perms.join(", ")}`);

  return NextResponse.json({ staffId, granted: perms });
}

export async function DELETE(req: NextRequest) {
  const auth = await requirePermission(req, "permissions.manage");
  if (!isStaffUser(auth)) return auth;

  const url = req.nextUrl;
  const staffId = url.searchParams.get("staffId") ?? "";
  const permission = url.searchParams.get("permission") ?? "";
  if (!staffId) return NextResponse.json({ error: "missing_staffId" }, { status: 400 });
  if (!permission || !PERMISSIONS.includes(permission as Permission)) {
    return NextResponse.json({ error: "invalid_permission" }, { status: 400 });
  }

  await revokeStaffExtra(staffId, permission as Permission);
  recordAudit(auth.id, "grants.revoke", staffId, `revoked ${permission}`);

  // Optional cleanup: if the staff row was a minimal 'member' with no extras
  // left and no in-game mapping, delete it so it doesn't linger in listings.
  const db = await getDb();
  const remaining = await getOne(db,
    "SELECT COUNT(*) as c FROM staff_extra_permissions WHERE staff_id = ? AND allowed = 1",
    [staffId]);
  if (remaining && Number(remaining.c) === 0) {
    const row = await getOne(db, "SELECT role, source FROM staff_users WHERE id = ?", [staffId]);
    if (row && row.role === "member" && row.source === "manual") {
      await run(db, "DELETE FROM staff_sessions WHERE staff_id = ?", [staffId]);
      await run(db, "DELETE FROM staff_users WHERE id = ?", [staffId]);
      recordAudit(auth.id, "grants.cleanup-member", staffId, "removed empty member row");
    }
  }

  return NextResponse.json({ ok: true });
}
