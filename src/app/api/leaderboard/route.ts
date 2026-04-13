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
  const where = search ? "WHERE username LIKE ?" : "";
  const params: unknown[] = search ? [`%${search}%`] : [];
  const rows = await getAll(db,
    `SELECT uuid, username, platform, total_playtime, session_count, last_seen, first_seen
     FROM players ${where} ORDER BY ${sortCol} DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]);
  const total = ((await getOne(db,
    `SELECT COUNT(*) as c FROM players ${where}`, params)) as Record<string, number>).c;

  return NextResponse.json({ players: rows, total });
}
