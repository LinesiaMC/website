import { NextRequest, NextResponse } from "next/server";
import { requirePermission, isStaffUser } from "@/lib/auth";
import { getDb, getAll } from "@/lib/analytics-db";

/** Lightweight player search for the grants UI — scoped to permissions.manage. */
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "permissions.manage");
  if (!isStaffUser(auth)) return auth;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2) return NextResponse.json({ players: [] });

  const db = await getDb();
  const rows = await getAll(db,
    `SELECT p.uuid, p.xuid, p.username, p.last_seen, pe.rank AS ingame_rank
       FROM players p
       LEFT JOIN player_profile_extra pe ON pe.xuid = p.xuid
      WHERE LOWER(p.username) LIKE ? OR p.xuid LIKE ? OR p.uuid LIKE ?
      ORDER BY p.last_seen DESC
      LIMIT 20`,
    [`%${q}%`, `%${q}%`, `%${q}%`]);

  return NextResponse.json({
    players: rows.map((r) => ({
      uuid: r.uuid as string,
      xuid: (r.xuid as string | null) || null,
      username: r.username as string,
      lastSeen: (r.last_seen as number | null) || null,
      ingameRank: (r.ingame_rank as string | null) || null,
    })),
  });
}
