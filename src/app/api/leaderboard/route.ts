import { NextRequest, NextResponse } from "next/server";
import { getDb, getAll, getOne } from "@/lib/analytics-db";

const ALLOWED = new Set(["total_playtime", "session_count", "last_seen", "first_seen"]);

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const sort = q.get("sort") || "total_playtime";
  const sortCol = ALLOWED.has(sort) ? sort : "total_playtime";
  const limit = Math.min(Number(q.get("limit")) || 50, 200);
  const offset = Math.max(Number(q.get("offset")) || 0, 0);
  const search = (q.get("search") || "").trim();

  const db = await getDb();
  const where = search ? "WHERE p.username LIKE ?" : "";
  const params: unknown[] = search ? [`%${search}%`] : [];
  const rows = await getAll(db,
    `SELECT p.uuid, p.username, p.platform, p.total_playtime, p.session_count, p.last_seen, p.first_seen,
            pa.id AS account_id, pa.microsoft_gamertag AS linked_ms_gamertag
     FROM players p
     LEFT JOIN player_accounts pa
       ON pa.linked_player_uuid = p.uuid OR pa.linked_player_uuid = p.xuid
     ${where} ORDER BY p.${sortCol} DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]);
  const total = ((await getOne(db,
    `SELECT COUNT(*) as c FROM players p ${where}`, params)) as Record<string, number>).c;

  const players = (rows as Record<string, unknown>[]).map((r) => ({
    uuid: r.uuid,
    username: r.username,
    platform: r.platform,
    total_playtime: r.total_playtime,
    session_count: r.session_count,
    last_seen: r.last_seen,
    first_seen: r.first_seen,
    linked: !!r.account_id,
    linked_ms_gamertag: r.linked_ms_gamertag || null,
  }));

  return NextResponse.json({ players, total });
}
