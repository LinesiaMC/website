import { NextRequest, NextResponse } from "next/server";
import { requirePermission, isStaffUser } from "@/lib/auth";
import { getDb, getAll, getOne } from "@/lib/analytics-db";

/**
 * Lists every player ever seen by the server, joined with link state
 * (player_accounts) and current in-game rank (player_profile_extra).
 *
 * Query params:
 *  - q: search by username/xuid/uuid (substring, case-insensitive)
 *  - link: "all" | "linked" | "unlinked"
 *  - rank: filter by ingame rank (string)
 *  - sort: "lastSeen" | "playtime" | "username"
 *  - limit, offset
 */
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "community.view");
  if (!isStaffUser(auth)) return auth;

  const url = req.nextUrl;
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const linkFilter = url.searchParams.get("link") ?? "all";
  const rankFilter = url.searchParams.get("rank") ?? "";
  const sort = url.searchParams.get("sort") ?? "lastSeen";
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10), 1), 200);
  const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "0", 10), 0);

  const db = await getDb();

  const wheres: string[] = [];
  const args: unknown[] = [];

  if (q) {
    wheres.push("(LOWER(p.username) LIKE ? OR p.xuid LIKE ? OR p.uuid LIKE ?)");
    const like = `%${q}%`;
    args.push(like, like, like);
  }
  if (rankFilter) {
    wheres.push("LOWER(pe.rank) = ?");
    args.push(rankFilter.toLowerCase());
  }
  if (linkFilter === "linked") wheres.push("pa.id IS NOT NULL");
  if (linkFilter === "unlinked") wheres.push("pa.id IS NULL");

  const orderBy = (() => {
    switch (sort) {
      case "playtime": return "p.total_playtime DESC";
      case "username": return "LOWER(p.username) ASC";
      case "firstSeen": return "p.first_seen DESC";
      default: return "p.last_seen DESC";
    }
  })();

  const where = wheres.length ? `WHERE ${wheres.join(" AND ")}` : "";

  const sql = `
    SELECT
      p.uuid, p.xuid, p.username, p.platform, p.first_seen, p.last_seen,
      p.total_playtime, p.session_count,
      pe.rank as ingame_rank, pe.prestige, pe.kills, pe.deaths,
      pa.id as account_id, pa.microsoft_id, pa.microsoft_gamertag,
      pa.microsoft_display_name, pa.created_at as linked_at,
      su.id as staff_id, su.role as staff_role, su.source as staff_source
    FROM players p
    LEFT JOIN player_profile_extra pe ON pe.xuid = p.xuid
    LEFT JOIN player_accounts pa ON pa.linked_player_uuid = p.xuid OR pa.linked_player_uuid = p.uuid
    LEFT JOIN staff_users su ON su.linked_xuid = p.xuid
    ${where}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;
  args.push(limit, offset);

  const rows = await getAll(db, sql, args);

  // Total count for pagination
  const countSql = `
    SELECT COUNT(*) as c
    FROM players p
    LEFT JOIN player_profile_extra pe ON pe.xuid = p.xuid
    LEFT JOIN player_accounts pa ON pa.linked_player_uuid = p.xuid OR pa.linked_player_uuid = p.uuid
    ${where}
  `;
  const countRow = await getOne(db, countSql, args.slice(0, args.length - 2));
  const total = (countRow?.c as number) || 0;

  return NextResponse.json({
    total,
    limit,
    offset,
    players: rows.map((r) => ({
      uuid: r.uuid,
      xuid: r.xuid,
      username: r.username,
      platform: r.platform || "Unknown",
      firstSeen: r.first_seen,
      lastSeen: r.last_seen,
      totalPlaytime: r.total_playtime || 0,
      sessionCount: r.session_count || 0,
      ingameRank: r.ingame_rank || null,
      prestige: r.prestige || 0,
      kills: r.kills || 0,
      deaths: r.deaths || 0,
      account: r.account_id ? {
        id: r.account_id,
        microsoftId: r.microsoft_id,
        microsoftGamertag: r.microsoft_gamertag,
        microsoftDisplayName: r.microsoft_display_name,
        linkedAt: r.linked_at,
      } : null,
      staff: r.staff_id ? {
        id: r.staff_id,
        role: r.staff_role,
        source: r.staff_source,
      } : null,
    })),
  });
}
