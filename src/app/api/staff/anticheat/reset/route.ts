import { NextRequest, NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/auth";
import { getDb, run, getOne } from "@/lib/analytics-db";
import { cacheInvalidate } from "@/lib/query-cache";

/**
 * Wipes all anti-cheat alert data (alert_stats + alert_events).
 * Founder-only — destructive operation, never restored once executed.
 */
export async function POST(req: NextRequest) {
  const staff = await getCurrentStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (staff.role !== "founder") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = await getDb();
  const before = await getOne(db,
    "SELECT (SELECT COUNT(*) FROM alert_stats) AS stats, (SELECT COUNT(*) FROM alert_events) AS events");
  const statsCount = Number(before?.stats ?? 0);
  const eventsCount = Number(before?.events ?? 0);

  await run(db, "DELETE FROM alert_stats");
  await run(db, "DELETE FROM alert_events");
  // Reset the alert_events autoincrement so ids restart from 1.
  try { await run(db, "DELETE FROM sqlite_sequence WHERE name = 'alert_events'"); } catch { /* table may not exist */ }

  await run(db,
    "INSERT INTO staff_audit (actor, action, target, detail, timestamp) VALUES (?,?,?,?,?)",
    [staff.id, "anticheat.reset", null,
      `wiped alert_stats (${statsCount}) + alert_events (${eventsCount})`, Date.now()]);

  cacheInvalidate(["alerts/"]);

  return NextResponse.json({ ok: true, deleted: { stats: statsCount, events: eventsCount } });
}
