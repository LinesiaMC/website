import { NextRequest, NextResponse } from "next/server";
import { getDb, getOne, getAll, serverFilter } from "@/lib/analytics-db";
import { cached } from "@/lib/query-cache";
import { getCurrentStaff } from "@/lib/auth";
import { hasPermission } from "@/lib/roles";
import { ITEM_ACTIVITY, ACTIVITIES, type Activity } from "@/lib/activity-categories";

/**
 * Analytics read API.
 *
 * Key principles used throughout this file to keep the DB cheap:
 *  - An in-memory TTL cache absorbs repeat reads from auto-refreshing admin
 *    pages (multiple tabs / multiple pages hit the same endpoints).
 *  - Per-day breakdowns are computed with a SINGLE grouped query (GROUP BY
 *    day bucket) instead of looping once per day.
 *  - Multi-count "overview" endpoints issue ONE query with subselects or
 *    conditional aggregation instead of 5-10 sequential getOne calls.
 */

async function checkAuth(req: NextRequest): Promise<boolean> {
  const staff = await getCurrentStaff(req);
  return !!staff && hasPermission(staff.role, "analytics.view");
}

const DAY_MS = 86_400_000;
const CACHE_TTL = 30_000; // 30s — tight enough for near-live dashboards

// SQL fragment: extracts the integer after "for " in the log's detail field.
// Used by Shop/Market buy/sell logs.
const PRICE_EXTRACT = `CAST(SUBSTR(detail, INSTR(detail, 'for ') + 4,
  CASE WHEN INSTR(SUBSTR(detail, INSTR(detail, 'for ') + 4), ' ') > 0
    THEN INSTR(SUBSTR(detail, INSTR(detail, 'for ') + 4), ' ') - 1
    ELSE LENGTH(SUBSTR(detail, INSTR(detail, 'for ') + 4))
  END) AS INTEGER)`;

function periodToSpanMs(period: string | null): number {
  switch (period) {
    case "24h": return DAY_MS;
    case "30d": return 30 * DAY_MS;
    case "all": return 0;
    case "7d":
    default:    return 7 * DAY_MS;
  }
}

/**
 * Build an array of N daily buckets starting from N-1 days ago up to today,
 * filling missing days with zero. `bucketFn` extracts the bucket index
 * (0 = today, 1 = yesterday, ...) from a DB row.
 */
function fillDailyBuckets<T extends Record<string, number>>(
  rows: Array<Record<string, unknown>>,
  days: number,
  now: number,
  zero: T,
): Array<T & { date: string }> {
  const byIdx = new Map<number, T>();
  for (const r of rows) {
    const idx = Number(r.days_ago);
    if (!Number.isFinite(idx) || idx < 0 || idx >= days) continue;
    const entry = { ...zero };
    for (const key of Object.keys(zero)) {
      const v = r[key];
      if (typeof v === "number") (entry as Record<string, number>)[key] = v;
      else if (typeof v === "bigint") (entry as Record<string, number>)[key] = Number(v);
      else if (v != null) (entry as Record<string, number>)[key] = Number(v) || 0;
    }
    byIdx.set(idx, entry);
  }
  const out: Array<T & { date: string }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = now - (i + 1) * DAY_MS;
    const date = new Date(dayStart).toISOString().split("T")[0];
    const v = byIdx.get(i) ?? { ...zero };
    out.push({ ...v, date });
  }
  return out;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  if (!(await checkAuth(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path } = await params;
  const route = path.join("/");
  const q = req.nextUrl.searchParams;
  const db = await getDb();

  // Cache key includes route + all query params. Player-detail endpoints
  // also include the uuid in the route itself.
  const cacheKey = `${route}?${q.toString()}`;

  try {
    switch (route) {
      // ==================== STATS ====================
      case "stats/overview": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const now = Date.now();
            const sid = q.get("server_id");
            const scoped = sid && sid !== "all";
            const sessionWhere = scoped ? "WHERE duration > 0 AND server_id = ?" : "WHERE duration > 0";
            const sessionParams: unknown[] = scoped ? [sid] : [];

            // Core counts — one fused query so we stay at a single round-trip
            // for all the scalar totals. Medians are computed separately because
            // window-function subqueries don't nest cleanly into subselects.
            const row = scoped
              ? (await getOne(
                  db,
                  `SELECT
                    (SELECT COUNT(DISTINCT player_uuid) FROM sessions WHERE server_id = ?) AS totalPlayers,
                    (SELECT COUNT(DISTINCT player_uuid) FROM sessions WHERE server_id = ? AND join_time > ?) AS activeLast24h,
                    (SELECT COUNT(DISTINCT player_uuid) FROM sessions WHERE server_id = ? AND join_time > ?) AS activeLast7d,
                    (SELECT COUNT(*) FROM players WHERE first_seen > ?) AS newLast24h,
                    (SELECT COUNT(*) FROM players WHERE first_seen > ?) AS newLast7d,
                    (SELECT COUNT(*) FROM logs WHERE category = 'command' AND server_id = ?) AS totalCommands,
                    (SELECT COUNT(*) FROM logs WHERE category = 'death' AND action = 'Death' AND server_id = ?) AS totalDeaths,
                    (SELECT COUNT(*) FROM logs WHERE category = 'chat' AND server_id = ?) AS totalMessages,
                    (SELECT AVG(total_playtime) FROM players WHERE total_playtime > 0) AS avgPlaytime,
                    (SELECT COUNT(*) FROM players WHERE total_playtime > 0) AS playersWithPlaytime,
                    (SELECT AVG(session_count) FROM players) AS avgSessionCount,
                    (SELECT COUNT(*) FROM sessions WHERE server_id = ? AND duration > 0) AS totalSessions,
                    (SELECT AVG(duration) FROM sessions WHERE server_id = ? AND duration > 0) AS avgSessionDuration`,
                  [
                    sid,
                    sid, now - DAY_MS,
                    sid, now - 7 * DAY_MS,
                    now - DAY_MS,
                    now - 7 * DAY_MS,
                    sid,
                    sid,
                    sid,
                    sid,
                    sid,
                  ],
                )) as Record<string, number> | null
              : (await getOne(
                  db,
                  `SELECT
                    (SELECT COUNT(*) FROM players) AS totalPlayers,
                    (SELECT COUNT(*) FROM players WHERE last_seen > ?) AS activeLast24h,
                    (SELECT COUNT(*) FROM players WHERE last_seen > ?) AS activeLast7d,
                    (SELECT COUNT(*) FROM players WHERE first_seen > ?) AS newLast24h,
                    (SELECT COUNT(*) FROM players WHERE first_seen > ?) AS newLast7d,
                    (SELECT COUNT(*) FROM logs WHERE category = 'command') AS totalCommands,
                    (SELECT COUNT(*) FROM logs WHERE category = 'death' AND action = 'Death') AS totalDeaths,
                    (SELECT COUNT(*) FROM logs WHERE category = 'chat') AS totalMessages,
                    (SELECT AVG(total_playtime) FROM players WHERE total_playtime > 0) AS avgPlaytime,
                    (SELECT COUNT(*) FROM players WHERE total_playtime > 0) AS playersWithPlaytime,
                    (SELECT AVG(session_count) FROM players) AS avgSessionCount,
                    (SELECT COUNT(*) FROM sessions WHERE duration > 0) AS totalSessions,
                    (SELECT AVG(duration) FROM sessions WHERE duration > 0) AS avgSessionDuration`,
                  [now - DAY_MS, now - 7 * DAY_MS, now - DAY_MS, now - 7 * DAY_MS],
                )) as Record<string, number> | null;

            // Median playtime (players) — window function trick, works on any
            // parity of N. Picks the middle row (odd N) or the two middle rows
            // and averages them (even N).
            const medianPlaytimeRow = (await getOne(
              db,
              `SELECT AVG(total_playtime) AS m FROM (
                 SELECT total_playtime,
                   ROW_NUMBER() OVER (ORDER BY total_playtime) AS rn,
                   COUNT(*) OVER () AS cnt
                 FROM players WHERE total_playtime > 0
               ) WHERE rn IN ((cnt + 1) / 2, (cnt + 2) / 2)`,
            )) as { m: number } | null;

            const medianSessionRow = (await getOne(
              db,
              `SELECT AVG(duration) AS m FROM (
                 SELECT duration,
                   ROW_NUMBER() OVER (ORDER BY duration) AS rn,
                   COUNT(*) OVER () AS cnt
                 FROM sessions ${sessionWhere}
               ) WHERE rn IN ((cnt + 1) / 2, (cnt + 2) / 2)`,
              sessionParams,
            )) as { m: number } | null;

            return {
              totalPlayers: row?.totalPlayers ?? 0,
              activeLast24h: row?.activeLast24h ?? 0,
              activeLast7d: row?.activeLast7d ?? 0,
              newLast24h: row?.newLast24h ?? 0,
              newLast7d: row?.newLast7d ?? 0,
              totalCommands: row?.totalCommands ?? 0,
              totalDeaths: row?.totalDeaths ?? 0,
              totalMessages: row?.totalMessages ?? 0,
              avgPlaytime: Math.round(row?.avgPlaytime ?? 0),
              medianPlaytime: Math.round(medianPlaytimeRow?.m ?? 0),
              playersWithPlaytime: row?.playersWithPlaytime ?? 0,
              avgSessionCount: Math.round(((row?.avgSessionCount ?? 0) as number) * 10) / 10,
              totalSessions: row?.totalSessions ?? 0,
              avgSessionDuration: Math.round(row?.avgSessionDuration ?? 0),
              medianSessionDuration: Math.round(medianSessionRow?.m ?? 0),
            };
          }),
        );
      }

      case "stats/daily-players": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const days = Number(q.get("days")) || 30;
            const sid = q.get("server_id");
            const now = Date.now();
            const from = now - days * DAY_MS;
            const sf = serverFilter(sid);
            const sWhere = sf.where ? `AND ${sf.where}` : "";

            // Two grouped queries instead of 2 × days getOne calls.
            const active = await getAll(
              db,
              `SELECT CAST((? - join_time) / ? AS INTEGER) AS days_ago,
                COUNT(DISTINCT player_uuid) AS activePlayers
              FROM sessions
              WHERE join_time >= ? ${sWhere}
              GROUP BY days_ago`,
              [now, DAY_MS, from, ...sf.params],
            );
            const neo = await getAll(
              db,
              `SELECT CAST((? - first_seen) / ? AS INTEGER) AS days_ago,
                COUNT(*) AS newPlayers
              FROM players
              WHERE first_seen >= ?
              GROUP BY days_ago`,
              [now, DAY_MS, from],
            );
            const merged = new Map<number, { activePlayers: number; newPlayers: number }>();
            for (const r of active) {
              const idx = Number(r.days_ago);
              merged.set(idx, { activePlayers: Number(r.activePlayers) || 0, newPlayers: 0 });
            }
            for (const r of neo) {
              const idx = Number(r.days_ago);
              const existing = merged.get(idx) ?? { activePlayers: 0, newPlayers: 0 };
              existing.newPlayers = Number(r.newPlayers) || 0;
              merged.set(idx, existing);
            }
            return fillDailyBuckets(
              Array.from(merged.entries()).map(([days_ago, v]) => ({ days_ago, ...v })),
              days,
              now,
              { activePlayers: 0, newPlayers: 0 },
            );
          }),
        );
      }

      case "stats/platforms": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const sid = q.get("server_id");
            if (sid && sid !== "all") {
              return getAll(
                db,
                `SELECT p.platform, COUNT(DISTINCT p.uuid) as count
                 FROM players p INNER JOIN sessions s ON s.player_uuid = p.uuid
                 WHERE s.server_id = ? GROUP BY p.platform ORDER BY count DESC`,
                [sid],
              );
            }
            return getAll(db, "SELECT platform, COUNT(*) as count FROM players GROUP BY platform ORDER BY count DESC");
          }),
        );
      }

      case "stats/churn": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const now = Date.now();
            // ONE query with conditional aggregation. Buckets:
            //   <1d, 1-3d, 3-7d, 7-30d, 30+d
            const row = (await getOne(
              db,
              `SELECT
                SUM(CASE WHEN (? - last_seen) < ? THEN 1 ELSE 0 END) AS b0,
                SUM(CASE WHEN (? - last_seen) >= ? AND (? - last_seen) < ? THEN 1 ELSE 0 END) AS b1,
                SUM(CASE WHEN (? - last_seen) >= ? AND (? - last_seen) < ? THEN 1 ELSE 0 END) AS b2,
                SUM(CASE WHEN (? - last_seen) >= ? AND (? - last_seen) < ? THEN 1 ELSE 0 END) AS b3,
                SUM(CASE WHEN (? - last_seen) >= ? THEN 1 ELSE 0 END) AS b4
              FROM players`,
              [
                now, DAY_MS,
                now, DAY_MS, now, 3 * DAY_MS,
                now, 3 * DAY_MS, now, 7 * DAY_MS,
                now, 7 * DAY_MS, now, 30 * DAY_MS,
                now, 30 * DAY_MS,
              ],
            )) as Record<string, number> | null;
            return [
              { label: "Actif (< 1 jour)", count: row?.b0 ?? 0 },
              { label: "Recent (1-3 jours)", count: row?.b1 ?? 0 },
              { label: "A risque (3-7 jours)", count: row?.b2 ?? 0 },
              { label: "Inactif (7-30 jours)", count: row?.b3 ?? 0 },
              { label: "Perdu (30+ jours)", count: row?.b4 ?? 0 },
            ];
          }),
        );
      }

      case "stats/commands": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const sid = q.get("server_id");
            const limit = Number(q.get("limit")) || 20;
            const sf = serverFilter(sid);
            const where = sf.where ? `WHERE category = 'command' AND ${sf.where}` : "WHERE category = 'command'";
            return getAll(
              db,
              `SELECT action as command, COUNT(*) as count FROM logs ${where} GROUP BY action ORDER BY count DESC LIMIT ?`,
              [...sf.params, limit],
            );
          }),
        );
      }

      case "stats/peak-hours": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const sid = q.get("server_id");
            const sf = serverFilter(sid);
            const where = sf.where ? `WHERE ${sf.where}` : "";
            return getAll(
              db,
              `SELECT (join_time / 3600000 % 24) as hour, COUNT(*) as count
               FROM sessions ${where} GROUP BY hour ORDER BY hour`,
              sf.params,
            );
          }),
        );
      }

      case "stats/retention": {
        // Parse range before cached(): an invalid range returns 400 directly.
        const now = Date.now();
        const toParam = q.get("to");
        const fromParam = q.get("from");
        const days = Number(q.get("days")) || 30;
        const to = toParam ? Number(toParam) : now;
        let from = fromParam ? Number(fromParam) : to - days * DAY_MS;
        if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
          return NextResponse.json({ error: "invalid range" }, { status: 400 });
        }
        // Clamp span — cohorts far in the past are fine, but guard against
        // pathological requests by capping at ~2 years.
        if (to - from > 730 * DAY_MS) from = to - 730 * DAY_MS;
        const span = Math.max(1, Math.ceil((to - from) / DAY_MS));

        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const sid = q.get("server_id");
            const sf = serverFilter(sid, "s");
            const sJoin = sf.where ? `AND ${sf.where}` : "";

            const joinedRows = await getAll(
              db,
              `SELECT CAST((? - first_seen) / ? AS INTEGER) AS days_ago, COUNT(*) AS c
               FROM players WHERE first_seen >= ? AND first_seen < ? GROUP BY days_ago`,
              [to, DAY_MS, from, to],
            );
            const day1Rows = await getAll(
              db,
              `SELECT CAST((? - p.first_seen) / ? AS INTEGER) AS days_ago,
                 COUNT(DISTINCT p.uuid) AS c
               FROM players p INNER JOIN sessions s ON s.player_uuid = p.uuid
               WHERE p.first_seen >= ? AND p.first_seen < ?
                 AND s.join_time > p.first_seen
                 AND s.join_time < p.first_seen + ?
                 ${sJoin}
               GROUP BY days_ago`,
              [to, DAY_MS, from, to, DAY_MS, ...sf.params],
            );
            const weekRows = await getAll(
              db,
              `SELECT CAST((? - p.first_seen) / ? AS INTEGER) AS days_ago,
                 COUNT(DISTINCT p.uuid) AS c
               FROM players p INNER JOIN sessions s ON s.player_uuid = p.uuid
               WHERE p.first_seen >= ? AND p.first_seen < ?
                 AND s.join_time > p.first_seen
                 AND s.join_time < p.first_seen + ?
                 ${sJoin}
               GROUP BY days_ago`,
              [to, DAY_MS, from, to, 7 * DAY_MS, ...sf.params],
            );
            // "Ever returned" = at least one session strictly after first_seen.
            // No upper time bound, so captures all returns up to `now`.
            const everRows = await getAll(
              db,
              `SELECT CAST((? - p.first_seen) / ? AS INTEGER) AS days_ago,
                 COUNT(DISTINCT p.uuid) AS c
               FROM players p INNER JOIN sessions s ON s.player_uuid = p.uuid
               WHERE p.first_seen >= ? AND p.first_seen < ?
                 AND s.join_time > p.first_seen
                 ${sJoin}
               GROUP BY days_ago`,
              [to, DAY_MS, from, to, ...sf.params],
            );

            const joinedByIdx = new Map<number, number>();
            const day1ByIdx = new Map<number, number>();
            const weekByIdx = new Map<number, number>();
            const everByIdx = new Map<number, number>();
            for (const r of joinedRows) joinedByIdx.set(Number(r.days_ago), Number(r.c) || 0);
            for (const r of day1Rows) day1ByIdx.set(Number(r.days_ago), Number(r.c) || 0);
            for (const r of weekRows) weekByIdx.set(Number(r.days_ago), Number(r.c) || 0);
            for (const r of everRows) everByIdx.set(Number(r.days_ago), Number(r.c) || 0);

            const daysArr: Array<{
              date: string;
              newPlayers: number;
              returnedDay1: number;
              returnedWeek: number;
              returnedEver: number;
              retentionDay1: number;
              retentionWeek: number;
              retentionEver: number;
            }> = [];
            for (let i = span - 1; i >= 0; i--) {
              const dayStart = to - (i + 1) * DAY_MS;
              const joined = joinedByIdx.get(i) ?? 0;
              const returnedDay1 = day1ByIdx.get(i) ?? 0;
              const returnedWeek = weekByIdx.get(i) ?? 0;
              const returnedEver = everByIdx.get(i) ?? 0;
              daysArr.push({
                date: new Date(dayStart).toISOString().split("T")[0],
                newPlayers: joined,
                returnedDay1,
                returnedWeek,
                returnedEver,
                retentionDay1: joined > 0 ? Math.round((returnedDay1 / joined) * 100) : 0,
                retentionWeek: joined > 0 ? Math.round((returnedWeek / joined) * 100) : 0,
                retentionEver: joined > 0 ? Math.round((returnedEver / joined) * 100) : 0,
              });
            }
            daysArr.reverse();

            // --- Cohort aggregate stats ---
            // total_playtime buckets: how long each new player spent on the
            // server in total (across every session they ever played).
            const dist = (await getOne(
              db,
              `SELECT
                COUNT(*) AS total,
                AVG(CASE WHEN total_playtime > 0 THEN total_playtime END) AS avgPlaytime,
                SUM(CASE WHEN total_playtime < 300000 THEN 1 ELSE 0 END) AS b0,
                SUM(CASE WHEN total_playtime >= 300000 AND total_playtime < 900000 THEN 1 ELSE 0 END) AS b1,
                SUM(CASE WHEN total_playtime >= 900000 AND total_playtime < 1800000 THEN 1 ELSE 0 END) AS b2,
                SUM(CASE WHEN total_playtime >= 1800000 AND total_playtime < 3600000 THEN 1 ELSE 0 END) AS b3,
                SUM(CASE WHEN total_playtime >= 3600000 AND total_playtime < 10800000 THEN 1 ELSE 0 END) AS b4,
                SUM(CASE WHEN total_playtime >= 10800000 AND total_playtime < 36000000 THEN 1 ELSE 0 END) AS b5,
                SUM(CASE WHEN total_playtime >= 36000000 THEN 1 ELSE 0 END) AS b6,
                SUM(CASE WHEN session_count <= 1 THEN 1 ELSE 0 END) AS oneAndDone,
                SUM(CASE WHEN session_count >= 2 THEN 1 ELSE 0 END) AS returned,
                AVG(CAST(session_count AS REAL)) AS avgSessionCount
              FROM players WHERE first_seen >= ? AND first_seen < ?`,
              [from, to],
            )) as Record<string, number> | null;

            const medianRow = (await getOne(
              db,
              `SELECT AVG(total_playtime) AS m FROM (
                 SELECT total_playtime,
                   ROW_NUMBER() OVER (ORDER BY total_playtime) AS rn,
                   COUNT(*) OVER () AS cnt
                 FROM players WHERE first_seen >= ? AND first_seen < ? AND total_playtime > 0
               ) WHERE rn IN ((cnt + 1) / 2, (cnt + 2) / 2)`,
              [from, to],
            )) as { m: number } | null;

            // First-session duration: for each cohort player, take the session
            // whose join_time equals their first_seen. That's the session
            // created when the account was registered.
            const firstSessionRow = (await getOne(
              db,
              `SELECT
                 SUM(CASE WHEN duration < 300000 THEN 1 ELSE 0 END) AS b0,
                 SUM(CASE WHEN duration >= 300000 AND duration < 900000 THEN 1 ELSE 0 END) AS b1,
                 SUM(CASE WHEN duration >= 900000 AND duration < 1800000 THEN 1 ELSE 0 END) AS b2,
                 SUM(CASE WHEN duration >= 1800000 AND duration < 3600000 THEN 1 ELSE 0 END) AS b3,
                 SUM(CASE WHEN duration >= 3600000 AND duration < 10800000 THEN 1 ELSE 0 END) AS b4,
                 SUM(CASE WHEN duration >= 10800000 THEN 1 ELSE 0 END) AS b5,
                 COUNT(*) AS total,
                 AVG(duration) AS avgDuration
               FROM (
                 SELECT MAX(s.duration) AS duration
                 FROM sessions s
                 INNER JOIN players p ON p.uuid = s.player_uuid
                 WHERE p.first_seen >= ? AND p.first_seen < ?
                   AND s.duration > 0
                   AND s.join_time = p.first_seen
                   ${sJoin}
                 GROUP BY s.player_uuid
               )`,
              [from, to, ...sf.params],
            )) as Record<string, number> | null;

            const total = dist?.total ?? 0;
            const returned = dist?.returned ?? 0;
            return {
              range: { from, to, days: span },
              days: daysArr,
              cohort: {
                total,
                returned,
                oneAndDone: dist?.oneAndDone ?? 0,
                retentionEver: total > 0 ? Math.round((returned / total) * 100) : 0,
                avgPlaytime: Math.round(dist?.avgPlaytime ?? 0),
                medianPlaytime: Math.round(medianRow?.m ?? 0),
                avgSessionCount: Math.round(((dist?.avgSessionCount ?? 0) as number) * 10) / 10,
                totalPlaytimeBuckets: [
                  { label: "<5m", count: dist?.b0 ?? 0 },
                  { label: "5-15m", count: dist?.b1 ?? 0 },
                  { label: "15-30m", count: dist?.b2 ?? 0 },
                  { label: "30m-1h", count: dist?.b3 ?? 0 },
                  { label: "1-3h", count: dist?.b4 ?? 0 },
                  { label: "3-10h", count: dist?.b5 ?? 0 },
                  { label: "10h+", count: dist?.b6 ?? 0 },
                ],
                firstSession: {
                  total: firstSessionRow?.total ?? 0,
                  avgDuration: Math.round(firstSessionRow?.avgDuration ?? 0),
                  buckets: [
                    { label: "<5m", count: firstSessionRow?.b0 ?? 0 },
                    { label: "5-15m", count: firstSessionRow?.b1 ?? 0 },
                    { label: "15-30m", count: firstSessionRow?.b2 ?? 0 },
                    { label: "30m-1h", count: firstSessionRow?.b3 ?? 0 },
                    { label: "1-3h", count: firstSessionRow?.b4 ?? 0 },
                    { label: "3h+", count: firstSessionRow?.b5 ?? 0 },
                  ],
                },
              },
            };
          }),
        );
      }

      case "stats/session-distribution": {
        // Distribution of session durations, server-wide (or scoped).
        // Used by the dashboard Temps de jeu card to show WHERE the playtime
        // comes from: lots of short sessions vs long ones.
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const sid = q.get("server_id");
            const sf = serverFilter(sid);
            const where = sf.where ? `WHERE duration > 0 AND ${sf.where}` : "WHERE duration > 0";
            const row = (await getOne(
              db,
              `SELECT
                COUNT(*) AS total,
                AVG(duration) AS avgDuration,
                SUM(CASE WHEN duration < 300000 THEN 1 ELSE 0 END) AS b0,
                SUM(CASE WHEN duration >= 300000 AND duration < 900000 THEN 1 ELSE 0 END) AS b1,
                SUM(CASE WHEN duration >= 900000 AND duration < 1800000 THEN 1 ELSE 0 END) AS b2,
                SUM(CASE WHEN duration >= 1800000 AND duration < 3600000 THEN 1 ELSE 0 END) AS b3,
                SUM(CASE WHEN duration >= 3600000 AND duration < 10800000 THEN 1 ELSE 0 END) AS b4,
                SUM(CASE WHEN duration >= 10800000 THEN 1 ELSE 0 END) AS b5
               FROM sessions ${where}`,
              sf.params,
            )) as Record<string, number> | null;
            return {
              total: row?.total ?? 0,
              avgDuration: Math.round(row?.avgDuration ?? 0),
              buckets: [
                { label: "<5m", count: row?.b0 ?? 0 },
                { label: "5-15m", count: row?.b1 ?? 0 },
                { label: "15-30m", count: row?.b2 ?? 0 },
                { label: "30m-1h", count: row?.b3 ?? 0 },
                { label: "1-3h", count: row?.b4 ?? 0 },
                { label: "3h+", count: row?.b5 ?? 0 },
              ],
            };
          }),
        );
      }

      // ==================== JOBS ====================
      case "stats/jobs": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            // Per-job XP table (copied from plugin JobsConstants::jobs())
            const JOB_XP: Record<string, Record<string, number>> = {
              Farmeur: { wheat: 2, beetroot: 2, potatoes: 2, carrots: 2, pumpkin: 2, melon: 2, nether_wart: 10 },
              Mineur:  { coal_ore: 1, emerald_ore: 2, amethyste_ore: 4, rubis_ore: 6 },
              Guerrier:{ zombie: 0.2, pigman: 0.3, wither: 0.4, player_kill: 30 },
              Pecheur: { fish: 4 }, // average across fish types (goldfish5/carp3/perch4/piranha8/red_shrooma10)
            };
            const JOB_BASE: Record<string, number> = { Farmeur: 1750, Mineur: 1750, Pecheur: 1750, Guerrier: 500 };
            const JOB_MULT: Record<string, number> = { Farmeur: 1.2, Mineur: 1.2, Pecheur: 1.2, Guerrier: 1.1 };
            const MAX_LEVEL = 25;

            const rows = await getAll(db, `SELECT jobs, stats_json FROM player_profile_extra WHERE jobs IS NOT NULL`, []);

            type JobAgg = {
              name: string;
              players: number;
              totalLevel: number;
              maxedCount: number;
              levelHistogram: number[]; // length MAX_LEVEL+1
              totalCurrentXp: number;
              totalLifetimeXp: number;
            };
            const jobs: Record<string, JobAgg> = {};
            const sourceCounts: Record<string, Record<string, number>> = {};
            let playersKillsTotal = 0;

            const lifetimeXpFor = (jobName: string, level: number, currentXp: number): number => {
              const base = JOB_BASE[jobName] ?? 1750;
              const mult = JOB_MULT[jobName] ?? 1.2;
              let sum = 0;
              for (let L = 1; L < level; L++) sum += base * Math.pow(mult, L - 1);
              return sum + (currentXp || 0);
            };

            for (const r of rows as Array<Record<string, unknown>>) {
              let pjobs: Array<{ name: string; level: number; xp: number; max_xp: number }> = [];
              try { pjobs = JSON.parse(String(r.jobs || "[]")); } catch { /* ignore */ }

              let stats: Record<string, number> = {};
              try { stats = JSON.parse(String(r.stats_json || "{}")); } catch { /* ignore */ }
              playersKillsTotal += Number(stats.kills || 0);

              for (const j of pjobs) {
                if (!j?.name) continue;
                const agg = jobs[j.name] ??= {
                  name: j.name, players: 0, totalLevel: 0, maxedCount: 0,
                  levelHistogram: new Array(MAX_LEVEL + 1).fill(0),
                  totalCurrentXp: 0, totalLifetimeXp: 0,
                };
                agg.players++;
                const lvl = Math.max(0, Math.min(MAX_LEVEL, Number(j.level) || 0));
                agg.totalLevel += lvl;
                if (lvl >= MAX_LEVEL) agg.maxedCount++;
                agg.levelHistogram[lvl]++;
                agg.totalCurrentXp += Number(j.xp) || 0;
                agg.totalLifetimeXp += lifetimeXpFor(j.name, lvl, Number(j.xp) || 0);

                // XP-source estimation from stats snapshot
                const srcTable = JOB_XP[j.name];
                if (srcTable) {
                  const bySrc = sourceCounts[j.name] ??= {};
                  for (const [src, xpPerUnit] of Object.entries(srcTable)) {
                    let count = 0;
                    if (src === "player_kill") count = Number(stats.kills || 0);
                    else count = Number(stats[src] || 0);
                    bySrc[src] = (bySrc[src] || 0) + count * xpPerUnit;
                  }
                }
              }
            }

            const jobList = Object.values(jobs).map((j) => ({
              name: j.name,
              players: j.players,
              avg_level: j.players ? +(j.totalLevel / j.players).toFixed(2) : 0,
              maxed_count: j.maxedCount,
              avg_current_xp: j.players ? Math.round(j.totalCurrentXp / j.players) : 0,
              avg_lifetime_xp: j.players ? Math.round(j.totalLifetimeXp / j.players) : 0,
              total_lifetime_xp: Math.round(j.totalLifetimeXp),
              level_histogram: j.levelHistogram,
              xp_by_source: Object.entries(sourceCounts[j.name] || {})
                .map(([source, xp]) => ({ source, xp: Math.round(xp) }))
                .sort((a, b) => b.xp - a.xp),
            }));

            return { jobs: jobList, total_players: rows.length, max_level: MAX_LEVEL };
          }),
        );
      }

      // ==================== PRESTIGE ====================
      case "stats/prestige": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const TOTAL_QUESTS = 111; // see PrestigesManager::$defaultQuest

            const [dist, quests, avg] = await Promise.all([
              getAll(db, `SELECT prestige, COUNT(*) as count FROM player_profile_extra WHERE xuid IS NOT NULL GROUP BY prestige ORDER BY prestige ASC`, []),
              getAll(db, `SELECT completed_quests FROM player_profile_extra WHERE completed_quests IS NOT NULL`, []),
              getOne(db, `SELECT AVG(prestige) as avg_prestige, MAX(prestige) as max_prestige, COUNT(*) as total_players FROM player_profile_extra WHERE xuid IS NOT NULL`, []),
            ]);

            const questCount: Record<string, number> = {};
            let totalQuestsCompleted = 0;
            let playersWithQuests = 0;
            for (const r of quests as Array<Record<string, unknown>>) {
              let arr: string[] = [];
              try { arr = JSON.parse(String(r.completed_quests || "[]")); } catch { /* ignore */ }
              if (!Array.isArray(arr) || arr.length === 0) continue;
              playersWithQuests++;
              totalQuestsCompleted += arr.length;
              for (const k of arr) questCount[k] = (questCount[k] || 0) + 1;
            }

            const categoryCount: Record<string, { completed: number; total: number }> = {};
            for (const [key, count] of Object.entries(questCount)) {
              const cat = key.replace(/\d+$/, "");
              const entry = categoryCount[cat] ??= { completed: 0, total: 0 };
              entry.completed += count;
              entry.total += 1;
            }

            return {
              distribution: dist,
              avg_prestige: Number((avg as Record<string, number>)?.avg_prestige) || 0,
              max_prestige: Number((avg as Record<string, number>)?.max_prestige) || 0,
              total_players: Number((avg as Record<string, number>)?.total_players) || 0,
              total_quests: TOTAL_QUESTS,
              total_quests_completed: totalQuestsCompleted,
              players_with_quests: playersWithQuests,
              avg_quests_per_player: playersWithQuests ? +(totalQuestsCompleted / playersWithQuests).toFixed(1) : 0,
              quest_counts: Object.entries(questCount)
                .map(([key, count]) => ({ key, count }))
                .sort((a, b) => b.count - a.count),
              category_counts: Object.entries(categoryCount)
                .map(([category, v]) => ({ category, completed: v.completed, tiers: v.total }))
                .sort((a, b) => b.completed - a.completed),
            };
          }),
        );
      }

      // ==================== PLAYERS ====================
      case "players": {
        // Not cached: paginated + searchable, hit rate would be poor.
        const sort = q.get("sort") || "last_seen";
        const order = q.get("order") === "ASC" ? "ASC" : "DESC";
        const limit = Number(q.get("limit")) || 50;
        const offset = Number(q.get("offset")) || 0;
        const search = q.get("search");
        const sid = q.get("server_id");
        const allowed = ["last_seen", "first_seen", "total_playtime", "session_count", "username"];
        const sortCol = allowed.includes(sort) ? sort : "last_seen";

        if (sid && sid !== "all") {
          let query = `SELECT DISTINCT p.* FROM players p INNER JOIN sessions s ON s.player_uuid = p.uuid WHERE s.server_id = ?`;
          const params: unknown[] = [sid];
          if (search) { query += " AND p.username LIKE ?"; params.push(`%${search}%`); }
          query += ` ORDER BY p.${sortCol} ${order} LIMIT ? OFFSET ?`;
          params.push(limit, offset);
          const players = await getAll(db, query, params);
          let cq = `SELECT COUNT(DISTINCT p.uuid) as count FROM players p INNER JOIN sessions s ON s.player_uuid = p.uuid WHERE s.server_id = ?`;
          const cp: unknown[] = [sid];
          if (search) { cq += " AND p.username LIKE ?"; cp.push(`%${search}%`); }
          const total = ((await getOne(db, cq, cp)) as Record<string, number>).count;
          return NextResponse.json({ players, total });
        }

        let query = "SELECT * FROM players";
        const params: unknown[] = [];
        if (search) { query += " WHERE username LIKE ?"; params.push(`%${search}%`); }
        query += ` ORDER BY ${sortCol} ${order} LIMIT ? OFFSET ?`;
        params.push(limit, offset);
        const players = await getAll(db, query, params);
        const cp = search ? [`%${search}%`] : [];
        const total = ((await getOne(db, `SELECT COUNT(*) as count FROM players ${search ? "WHERE username LIKE ?" : ""}`, cp)) as Record<string, number>).count;
        return NextResponse.json({ players, total });
      }

      // ==================== LOGS ====================
      case "logs": {
        // Not cached: highly-parametrized + drives a search UI.
        const player = q.get("player"), category = q.get("category"), action = q.get("action");
        const item = q.get("item"), itemUid = q.get("item_uid"), target = q.get("target");
        const world = q.get("world"), level = q.get("level"), search = q.get("search");
        const from = q.get("from"), to = q.get("to"), sid = q.get("server_id");
        const limit = Number(q.get("limit")) || 100, offset = Number(q.get("offset")) || 0;

        const where: string[] = [], params: unknown[] = [];
        if (sid && sid !== "all") { where.push("server_id = ?"); params.push(sid); }
        if (player) { where.push("(player_name LIKE ? OR player_uuid = ?)"); params.push(`%${player}%`, player); }
        if (category) { where.push("category = ?"); params.push(category); }
        if (action) { where.push("action LIKE ?"); params.push(`%${action}%`); }
        if (item) { where.push("item_name LIKE ?"); params.push(`%${item}%`); }
        if (itemUid) { where.push("item_uid = ?"); params.push(itemUid); }
        if (target) { where.push("target_player LIKE ?"); params.push(`%${target}%`); }
        if (world) { where.push("world = ?"); params.push(world); }
        if (level) { where.push("level = ?"); params.push(level); }
        if (search) { where.push("(detail LIKE ? OR action LIKE ? OR item_name LIKE ? OR player_name LIKE ?)"); params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
        if (from) { where.push("timestamp >= ?"); params.push(Number(from)); }
        if (to) { where.push("timestamp <= ?"); params.push(Number(to)); }

        const wc = where.length > 0 ? "WHERE " + where.join(" AND ") : "";
        const total = ((await getOne(db, `SELECT COUNT(*) as count FROM logs ${wc}`, params)) as Record<string, number>).count;
        const logs = await getAll(db, `SELECT * FROM logs ${wc} ORDER BY timestamp DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
        return NextResponse.json({ logs, total });
      }

      case "logs/categories": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const sid = q.get("server_id");
            const sf = serverFilter(sid);
            const where = sf.where ? `WHERE ${sf.where}` : "";
            return getAll(
              db,
              `SELECT category, COUNT(*) as count FROM logs ${where} GROUP BY category ORDER BY count DESC`,
              sf.params,
            );
          }),
        );
      }

      case "logs/stats": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const sid = q.get("server_id");
            const now = Date.now();
            const sf = serverFilter(sid);
            const w = sf.where ? `WHERE ${sf.where}` : "";
            const wAnd = sf.where ? `WHERE ${sf.where} AND` : "WHERE";

            // Fuse 4 scalar counts into a single query using conditional aggregation.
            const counts = (await getOne(
              db,
              `SELECT
                COUNT(*) AS totalLogs,
                SUM(CASE WHEN timestamp > ? THEN 1 ELSE 0 END) AS logsLast24h,
                SUM(CASE WHEN level = 'warning' THEN 1 ELSE 0 END) AS warnings,
                SUM(CASE WHEN level = 'warning' AND timestamp > ? THEN 1 ELSE 0 END) AS warningsLast24h
               FROM logs ${w}`,
              [now - DAY_MS, now - DAY_MS, ...sf.params],
            )) as Record<string, number> | null;

            const [topPlayers, topItems, topActions] = await Promise.all([
              getAll(
                db,
                `SELECT player_name, COUNT(*) as count FROM logs ${wAnd} player_name IS NOT NULL
                 GROUP BY player_name ORDER BY count DESC LIMIT 10`,
                sf.params,
              ),
              getAll(
                db,
                `SELECT item_name, COUNT(*) as count FROM logs ${wAnd} item_name IS NOT NULL AND item_name != ''
                 GROUP BY item_name ORDER BY count DESC LIMIT 10`,
                sf.params,
              ),
              getAll(
                db,
                `SELECT action, COUNT(*) as count FROM logs ${w} GROUP BY action ORDER BY count DESC LIMIT 10`,
                sf.params,
              ),
            ]);

            return {
              totalLogs: counts?.totalLogs ?? 0,
              logsLast24h: counts?.logsLast24h ?? 0,
              warnings: counts?.warnings ?? 0,
              warningsLast24h: counts?.warningsLast24h ?? 0,
              topPlayers,
              topItems,
              topActions,
            };
          }),
        );
      }

      // ==================== CASINO ====================
      case "stats/casino": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const now = Date.now();
            const sid = q.get("server_id");
            const sf = serverFilter(sid);
            const w = sf.where ? `WHERE ${sf.where}` : "";

            // Fused query — was 10 sequential getOne calls before.
            const row = (await getOne(
              db,
              `SELECT
                COUNT(*) AS totalBets,
                COALESCE(SUM(bet_amount), 0) AS totalBetAmount,
                COALESCE(SUM(win_amount), 0) AS totalWinAmount,
                COALESCE(SUM(net_result), 0) AS totalNetResult,
                COUNT(DISTINCT player_uuid) AS uniquePlayers,
                SUM(CASE WHEN timestamp > ? THEN 1 ELSE 0 END) AS betsLast24h,
                SUM(CASE WHEN timestamp > ? THEN 1 ELSE 0 END) AS betsLast7d,
                SUM(CASE WHEN net_result > 0 THEN 1 ELSE 0 END) AS winsCount,
                SUM(CASE WHEN net_result < 0 THEN 1 ELSE 0 END) AS lossesCount,
                COALESCE(AVG(bet_amount), 0) AS avgBet
               FROM casino_transactions ${w}`,
              [now - DAY_MS, now - 7 * DAY_MS, ...sf.params],
            )) as Record<string, number> | null;

            return {
              totalBets: row?.totalBets ?? 0,
              totalBetAmount: row?.totalBetAmount ?? 0,
              totalWinAmount: row?.totalWinAmount ?? 0,
              totalNetResult: row?.totalNetResult ?? 0,
              uniquePlayers: row?.uniquePlayers ?? 0,
              betsLast24h: row?.betsLast24h ?? 0,
              betsLast7d: row?.betsLast7d ?? 0,
              winsCount: row?.winsCount ?? 0,
              lossesCount: row?.lossesCount ?? 0,
              avgBet: Math.round(row?.avgBet ?? 0),
            };
          }),
        );
      }

      case "stats/casino/games": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const sid = q.get("server_id");
            const sf = serverFilter(sid);
            const w = sf.where ? `WHERE ${sf.where}` : "";
            return getAll(
              db,
              `SELECT game, COUNT(*) as total_bets, SUM(bet_amount) as total_bet,
                SUM(win_amount) as total_won, SUM(net_result) as net,
                COUNT(DISTINCT player_uuid) as players
               FROM casino_transactions ${w} GROUP BY game ORDER BY total_bets DESC`,
              sf.params,
            );
          }),
        );
      }

      case "stats/casino/daily": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const days = Number(q.get("days")) || 30;
            const sid = q.get("server_id");
            const now = Date.now();
            const from = now - days * DAY_MS;
            const sf = serverFilter(sid);
            const sWhere = sf.where ? `AND ${sf.where}` : "";
            const rows = await getAll(
              db,
              `SELECT CAST((? - timestamp) / ? AS INTEGER) AS days_ago,
                COUNT(*) AS bets,
                COALESCE(SUM(bet_amount), 0) AS betTotal,
                COALESCE(SUM(win_amount), 0) AS winTotal,
                COALESCE(SUM(net_result), 0) AS net
               FROM casino_transactions
               WHERE timestamp >= ? ${sWhere}
               GROUP BY days_ago`,
              [now, DAY_MS, from, ...sf.params],
            );
            return fillDailyBuckets(rows, days, now, { bets: 0, betTotal: 0, winTotal: 0, net: 0 });
          }),
        );
      }

      case "stats/casino/top-players": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const sid = q.get("server_id");
            const limit = Number(q.get("limit")) || 10;
            const sf = serverFilter(sid, "c");
            const sJoin = sf.where ? `AND ${sf.where}` : "";
            return getAll(
              db,
              `SELECT c.player_uuid, p.username, COUNT(*) as total_bets,
                SUM(c.bet_amount) as total_bet, SUM(c.win_amount) as total_won,
                SUM(c.net_result) as net
               FROM casino_transactions c
               LEFT JOIN players p ON p.uuid = c.player_uuid
               WHERE 1=1 ${sJoin} GROUP BY c.player_uuid ORDER BY total_bets DESC LIMIT ?`,
              [...sf.params, limit],
            );
          }),
        );
      }

      // ==================== ECONOMY ====================
      case "stats/economy": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const sid = q.get("server_id");
            const sf = serverFilter(sid);
            const wCat = sf.where ? `WHERE category = 'economy' AND ${sf.where}` : "WHERE category = 'economy'";
            const now = Date.now();

            // price extraction: CAST(SUBSTR(detail, INSTR(detail, 'for ') + 4 ...) AS INTEGER)
            // Folded into a single pass with conditional sums.
            const row = (await getOne(
              db,
              `SELECT
                SUM(CASE WHEN action = 'ShopBuy' THEN 1 ELSE 0 END) AS shopBuyCount,
                COALESCE(SUM(CASE WHEN action = 'ShopBuy' THEN
                  CAST(SUBSTR(detail, INSTR(detail, 'for ') + 4,
                    CASE WHEN INSTR(SUBSTR(detail, INSTR(detail, 'for ') + 4), ' ') > 0
                      THEN INSTR(SUBSTR(detail, INSTR(detail, 'for ') + 4), ' ') - 1
                      ELSE LENGTH(SUBSTR(detail, INSTR(detail, 'for ') + 4))
                    END) AS INTEGER)
                  ELSE 0 END), 0) AS shopBuyVolume,
                SUM(CASE WHEN action IN ('ShopSell','SellAll') THEN 1 ELSE 0 END) AS shopSellCount,
                COALESCE(SUM(CASE WHEN action IN ('ShopSell','SellAll') THEN
                  CAST(SUBSTR(detail, INSTR(detail, 'for ') + 4,
                    CASE WHEN INSTR(SUBSTR(detail, INSTR(detail, 'for ') + 4), ' ') > 0
                      THEN INSTR(SUBSTR(detail, INSTR(detail, 'for ') + 4), ' ') - 1
                      ELSE LENGTH(SUBSTR(detail, INSTR(detail, 'for ') + 4))
                    END) AS INTEGER)
                  ELSE 0 END), 0) AS shopSellVolume,
                SUM(CASE WHEN action = 'MarketBuy' THEN 1 ELSE 0 END) AS marketBuyCount,
                SUM(CASE WHEN action = 'MarketSell' THEN 1 ELSE 0 END) AS marketSellCount,
                SUM(CASE WHEN action = 'Pay' THEN 1 ELSE 0 END) AS payCount,
                SUM(CASE WHEN timestamp > ? THEN 1 ELSE 0 END) AS txLast24h,
                SUM(CASE WHEN timestamp > ? THEN 1 ELSE 0 END) AS txLast7d
               FROM logs ${wCat}`,
              [now - DAY_MS, now - 7 * DAY_MS, ...sf.params],
            )) as Record<string, number> | null;

            return {
              shopBuyCount: row?.shopBuyCount ?? 0,
              shopBuyVolume: row?.shopBuyVolume ?? 0,
              shopSellCount: row?.shopSellCount ?? 0,
              shopSellVolume: row?.shopSellVolume ?? 0,
              marketBuyCount: row?.marketBuyCount ?? 0,
              marketSellCount: row?.marketSellCount ?? 0,
              payCount: row?.payCount ?? 0,
              txLast24h: row?.txLast24h ?? 0,
              txLast7d: row?.txLast7d ?? 0,
            };
          }),
        );
      }

      case "stats/economy/daily": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const days = Number(q.get("days")) || 30;
            const sid = q.get("server_id");
            const now = Date.now();
            const from = now - days * DAY_MS;
            const sf = serverFilter(sid);
            const sWhere = sf.where ? `AND ${sf.where}` : "";

            // Single GROUP BY day_bucket with conditional aggregation.
            const rows = await getAll(
              db,
              `SELECT CAST((? - timestamp) / ? AS INTEGER) AS days_ago,
                SUM(CASE WHEN action = 'ShopBuy' THEN 1 ELSE 0 END) AS shopBuys,
                SUM(CASE WHEN action IN ('ShopSell','SellAll') THEN 1 ELSE 0 END) AS shopSells,
                SUM(CASE WHEN action IN ('MarketBuy','MarketSell') THEN 1 ELSE 0 END) AS marketTx
               FROM logs
               WHERE category = 'economy' AND timestamp >= ? ${sWhere}
               GROUP BY days_ago`,
              [now, DAY_MS, from, ...sf.params],
            );
            return fillDailyBuckets(rows, days, now, { shopBuys: 0, shopSells: 0, marketTx: 0 });
          }),
        );
      }

      case "stats/economy/circulation": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const sid = q.get("server_id");
            const sf = serverFilter(sid);
            const w = sf.where ? `WHERE ${sf.where}` : "";
            const latest = await getOne(db, `SELECT * FROM economy_snapshots ${w} ORDER BY timestamp DESC LIMIT 1`, sf.params);
            const history = await getAll(
              db,
              `SELECT total_money, player_count, avg_money, timestamp FROM economy_snapshots ${w} ORDER BY timestamp DESC LIMIT 30`,
              sf.params,
            );
            return { latest, history: history.reverse() };
          }),
        );
      }

      // ==================== BALANCE (profitability per activity) ====================
      case "stats/balance/activities": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const period = q.get("period");
            const now = Date.now();
            const span = periodToSpanMs(period);
            const from = span === 0 ? 0 : now - span;
            const prevFrom = span === 0 ? 0 : now - 2 * span;
            const prevTo = span === 0 ? 0 : now - span;
            const sid = q.get("server_id");
            const sf = serverFilter(sid);
            const sWhere = sf.where ? `AND ${sf.where}` : "";

            const zero = (): Record<Activity, number> =>
              ({ mine: 0, farm: 0, wood: 0, mob: 0, fish: 0 });

            // 1. Active-time buckets: 60s per (player, activity). Row count * 60s = active time.
            const bucketRows = await getAll(
              db,
              `SELECT LOWER(action) AS activity,
                      COUNT(*) AS bucket_count,
                      COUNT(DISTINCT player_uuid) AS player_count,
                      SUM(items) AS items_total
               FROM (
                 SELECT action, player_uuid,
                        SUM(COALESCE(item_count, 1)) AS items
                 FROM logs
                 WHERE category = 'harvest'
                   AND action IN ('Mine','Farm','Wood','Mob','Fish')
                   AND timestamp >= ? ${sWhere}
                 GROUP BY action, player_uuid, timestamp / 60000
               )
               GROUP BY activity`,
              [from, ...sf.params],
            ) as Array<{ activity: Activity; bucket_count: number; player_count: number; items_total: number }>;

            // 2. Revenue per item_name (current period).
            const sellRows = await getAll(
              db,
              `SELECT item_name, SUM(${PRICE_EXTRACT}) AS total
               FROM logs
               WHERE category = 'economy'
                 AND action IN ('ShopSell','SellAll','MarketSell')
                 AND timestamp >= ? AND item_name IS NOT NULL AND item_name != ''
                 AND detail LIKE '%for %' ${sWhere}
               GROUP BY item_name`,
              [from, ...sf.params],
            ) as Array<{ item_name: string; total: number }>;

            // 3. Expense per input/tool item (current period).
            const buyRows = await getAll(
              db,
              `SELECT item_name, SUM(${PRICE_EXTRACT}) AS total
               FROM logs
               WHERE category = 'economy' AND action = 'ShopBuy'
                 AND timestamp >= ? AND item_name IS NOT NULL AND item_name != ''
                 AND detail LIKE '%for %' ${sWhere}
               GROUP BY item_name`,
              [from, ...sf.params],
            ) as Array<{ item_name: string; total: number }>;

            // 4. Previous period revenue (for trend) — only run if period is bounded.
            let prevSellRows: Array<{ item_name: string; total: number }> = [];
            if (span > 0) {
              prevSellRows = await getAll(
                db,
                `SELECT item_name, SUM(${PRICE_EXTRACT}) AS total
                 FROM logs
                 WHERE category = 'economy'
                   AND action IN ('ShopSell','SellAll','MarketSell')
                   AND timestamp >= ? AND timestamp < ?
                   AND item_name IS NOT NULL AND item_name != ''
                   AND detail LIKE '%for %' ${sWhere}
                 GROUP BY item_name`,
                [prevFrom, prevTo, ...sf.params],
              ) as Array<{ item_name: string; total: number }>;
            }

            const revenueByActivity = zero();
            const expenseByActivity = zero();
            const prevRevenueByActivity = zero();
            for (const row of sellRows) {
              const cfg = ITEM_ACTIVITY[row.item_name];
              if (cfg?.role === "output") revenueByActivity[cfg.activity] += Number(row.total) || 0;
            }
            for (const row of buyRows) {
              const cfg = ITEM_ACTIVITY[row.item_name];
              if (cfg && (cfg.role === "input" || cfg.role === "tool"))
                expenseByActivity[cfg.activity] += Number(row.total) || 0;
            }
            for (const row of prevSellRows) {
              const cfg = ITEM_ACTIVITY[row.item_name];
              if (cfg?.role === "output") prevRevenueByActivity[cfg.activity] += Number(row.total) || 0;
            }

            const byActivity = new Map<Activity, { bucket_count: number; player_count: number; items_total: number }>();
            for (const row of bucketRows) byActivity.set(row.activity as Activity, row);

            return ACTIVITIES.map((activity) => {
              const row = byActivity.get(activity);
              const hours_active = (row?.bucket_count ?? 0) * 60 / 3600;
              const revenue = revenueByActivity[activity];
              const expense = expenseByActivity[activity];
              const net = revenue - expense;
              const per_hour = hours_active > 0 ? net / hours_active : 0;
              const prevRevenue = prevRevenueByActivity[activity];
              const delta_pct = prevRevenue > 0
                ? ((revenue - prevRevenue) / prevRevenue) * 100
                : (revenue > 0 ? 100 : 0);
              return {
                activity,
                hours_active,
                active_players: Number(row?.player_count ?? 0),
                items_total: Number(row?.items_total ?? 0),
                revenue,
                expense,
                net,
                per_hour,
                delta_pct,
              };
            });
          }),
        );
      }

      case "stats/balance/items": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const period = q.get("period");
            const activityFilter = (q.get("activity") || "").toLowerCase();
            const search = q.get("search");
            const now = Date.now();
            const span = periodToSpanMs(period);
            const from = span === 0 ? 0 : now - span;
            const sid = q.get("server_id");
            const sf = serverFilter(sid);
            const sWhere = sf.where ? `AND ${sf.where}` : "";

            const rows = await getAll(
              db,
              `SELECT item_name,
                SUM(CASE WHEN action IN ('ShopBuy','MarketBuy') THEN COALESCE(item_count,1) ELSE 0 END) AS bought,
                SUM(CASE WHEN action IN ('ShopSell','SellAll','MarketSell') THEN COALESCE(item_count,1) ELSE 0 END) AS sold,
                SUM(CASE WHEN action = 'Craft' THEN COALESCE(item_count,1) ELSE 0 END) AS crafted,
                SUM(CASE WHEN action = 'BoxOpen' THEN COALESCE(item_count,1) ELSE 0 END) AS from_boxes,
                SUM(CASE WHEN action IN ('ShopSell','SellAll','MarketSell') AND detail LIKE '%for %' THEN ${PRICE_EXTRACT} ELSE 0 END) AS revenue,
                SUM(CASE WHEN action = 'ShopBuy' AND detail LIKE '%for %' THEN ${PRICE_EXTRACT} ELSE 0 END) AS expense,
                AVG(CASE WHEN action IN ('ShopSell','SellAll','MarketSell') AND detail LIKE '%for %'
                          THEN (${PRICE_EXTRACT}) * 1.0 / NULLIF(COALESCE(item_count,1), 0) END) AS avg_sell_price,
                AVG(CASE WHEN action = 'ShopBuy' AND detail LIKE '%for %'
                          THEN (${PRICE_EXTRACT}) * 1.0 / NULLIF(COALESCE(item_count,1), 0) END) AS avg_buy_price,
                COUNT(*) AS total_tx
               FROM logs
               WHERE item_name IS NOT NULL AND item_name != ''
                 AND category IN ('economy','craft','box')
                 AND timestamp >= ?
                 ${search ? "AND item_name LIKE ?" : ""}
                 ${sWhere}
               GROUP BY item_name
               HAVING total_tx > 0`,
              [from, ...(search ? [`%${search}%`] : []), ...sf.params],
            ) as Array<{
              item_name: string;
              bought: number; sold: number; crafted: number; from_boxes: number;
              revenue: number; expense: number;
              avg_sell_price: number | null; avg_buy_price: number | null;
              total_tx: number;
            }>;

            const enriched = rows.map((r) => {
              const cfg = ITEM_ACTIVITY[r.item_name];
              const avg_sell = Number(r.avg_sell_price) || 0;
              const avg_buy = Number(r.avg_buy_price) || 0;
              return {
                item_name: r.item_name,
                activity: cfg?.activity ?? null,
                role: cfg?.role ?? null,
                bought: Number(r.bought) || 0,
                sold: Number(r.sold) || 0,
                crafted: Number(r.crafted) || 0,
                from_boxes: Number(r.from_boxes) || 0,
                net_circulation: (Number(r.bought) || 0) + (Number(r.crafted) || 0) + (Number(r.from_boxes) || 0) - (Number(r.sold) || 0),
                revenue: Number(r.revenue) || 0,
                expense: Number(r.expense) || 0,
                avg_sell_price: avg_sell > 0 ? Math.round(avg_sell * 100) / 100 : null,
                avg_buy_price: avg_buy > 0 ? Math.round(avg_buy * 100) / 100 : null,
                margin: (avg_sell > 0 && avg_buy > 0) ? Math.round((avg_sell - avg_buy) * 100) / 100 : null,
                total_tx: Number(r.total_tx) || 0,
              };
            });

            const revenuePerActivity: Record<string, number> = {};
            for (const it of enriched) {
              if (it.activity) revenuePerActivity[it.activity] = (revenuePerActivity[it.activity] ?? 0) + it.revenue;
            }

            const withShare = enriched.map((it) => ({
              ...it,
              activity_revenue_share: it.activity && revenuePerActivity[it.activity] > 0
                ? (it.revenue / revenuePerActivity[it.activity]) * 100
                : 0,
            }));

            const filtered = activityFilter
              ? withShare.filter((it) => it.activity === activityFilter)
              : withShare;

            filtered.sort((a, b) => b.revenue - a.revenue || b.total_tx - a.total_tx);

            return { items: filtered.slice(0, 200), total: filtered.length };
          }),
        );
      }

      case "stats/balance/timeline": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const period = q.get("period") ?? "30d";
            const now = Date.now();
            const span = periodToSpanMs(period) || 30 * DAY_MS;
            const from = now - span;
            const days = Math.max(1, Math.round(span / DAY_MS));
            const sid = q.get("server_id");
            const sf = serverFilter(sid);
            const sWhere = sf.where ? `AND ${sf.where}` : "";

            const [harvestRows, sellRows] = await Promise.all([
              getAll(
                db,
                `SELECT CAST((? - timestamp) / ? AS INTEGER) AS days_ago,
                        LOWER(action) AS activity,
                        COUNT(DISTINCT player_uuid || '|' || (timestamp / 60000)) AS buckets
                 FROM logs
                 WHERE category = 'harvest'
                   AND action IN ('Mine','Farm','Wood','Mob','Fish')
                   AND timestamp >= ? ${sWhere}
                 GROUP BY days_ago, activity`,
                [now, DAY_MS, from, ...sf.params],
              ) as Promise<Array<{ days_ago: number; activity: Activity; buckets: number }>>,
              getAll(
                db,
                `SELECT CAST((? - timestamp) / ? AS INTEGER) AS days_ago,
                        item_name,
                        SUM(${PRICE_EXTRACT}) AS revenue
                 FROM logs
                 WHERE category = 'economy'
                   AND action IN ('ShopSell','SellAll','MarketSell')
                   AND timestamp >= ? AND item_name IS NOT NULL AND detail LIKE '%for %' ${sWhere}
                 GROUP BY days_ago, item_name`,
                [now, DAY_MS, from, ...sf.params],
              ) as Promise<Array<{ days_ago: number; item_name: string; revenue: number }>>,
            ]);

            // Build per-day × per-activity revenue + buckets.
            const byDay: Record<number, Record<Activity, { revenue: number; buckets: number }>> = {};
            const zeroActivities = (): Record<Activity, { revenue: number; buckets: number }> =>
              ({ mine: { revenue: 0, buckets: 0 }, farm: { revenue: 0, buckets: 0 },
                 wood: { revenue: 0, buckets: 0 }, mob: { revenue: 0, buckets: 0 },
                 fish: { revenue: 0, buckets: 0 } });

            for (const r of harvestRows) {
              const d = Number(r.days_ago);
              if (!Number.isFinite(d) || d < 0 || d >= days) continue;
              byDay[d] ??= zeroActivities();
              byDay[d][r.activity].buckets += Number(r.buckets) || 0;
            }
            for (const r of sellRows) {
              const d = Number(r.days_ago);
              if (!Number.isFinite(d) || d < 0 || d >= days) continue;
              const cfg = ITEM_ACTIVITY[r.item_name];
              if (!cfg || cfg.role !== "output") continue;
              byDay[d] ??= zeroActivities();
              byDay[d][cfg.activity].revenue += Number(r.revenue) || 0;
            }

            const out: Array<{ date: string } & Record<Activity, number>> = [];
            for (let i = days - 1; i >= 0; i--) {
              const dayStart = now - (i + 1) * DAY_MS;
              const date = new Date(dayStart).toISOString().split("T")[0];
              const entry = byDay[i] ?? zeroActivities();
              const row = { date } as { date: string } & Record<Activity, number>;
              for (const a of ACTIVITIES) {
                const hours = entry[a].buckets * 60 / 3600;
                row[a] = hours > 0 ? Math.round(entry[a].revenue / hours) : 0;
              }
              out.push(row);
            }
            return out;
          }),
        );
      }

      case "stats/balance/anomalies": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const period = q.get("period");
            const now = Date.now();
            const span = periodToSpanMs(period);
            const from = span === 0 ? 0 : now - span;
            const sid = q.get("server_id");
            const sf = serverFilter(sid);
            const sWhere = sf.where ? `AND ${sf.where}` : "";

            const itemFlow = await getAll(
              db,
              `SELECT item_name,
                SUM(CASE WHEN action IN ('ShopBuy','MarketBuy') THEN COALESCE(item_count,1) ELSE 0 END) AS bought,
                SUM(CASE WHEN action IN ('ShopSell','SellAll','MarketSell') THEN COALESCE(item_count,1) ELSE 0 END) AS sold,
                SUM(CASE WHEN action = 'Craft' THEN COALESCE(item_count,1) ELSE 0 END) AS crafted,
                SUM(CASE WHEN action = 'BoxOpen' THEN COALESCE(item_count,1) ELSE 0 END) AS from_boxes,
                SUM(CASE WHEN action IN ('ShopSell','SellAll','MarketSell') AND detail LIKE '%for %' THEN ${PRICE_EXTRACT} ELSE 0 END) AS revenue,
                COUNT(*) AS total_tx
               FROM logs
               WHERE category IN ('economy','craft','box')
                 AND item_name IS NOT NULL AND item_name != ''
                 AND timestamp >= ? ${sWhere}
               GROUP BY item_name`,
              [from, ...sf.params],
            ) as Array<{
              item_name: string; bought: number; sold: number; crafted: number;
              from_boxes: number; revenue: number; total_tx: number;
            }>;

            const sinks: Array<{ item_name: string; bought: number; sold: number }> = [];
            const dupeSuspects: Array<{ item_name: string; sold: number; produced: number; delta: number }> = [];
            const uncategorized: Array<{ item_name: string; revenue: number; total_tx: number }> = [];

            for (const r of itemFlow) {
              const bought = Number(r.bought) || 0;
              const sold = Number(r.sold) || 0;
              const crafted = Number(r.crafted) || 0;
              const from_boxes = Number(r.from_boxes) || 0;
              const revenue = Number(r.revenue) || 0;
              const total_tx = Number(r.total_tx) || 0;
              const cfg = ITEM_ACTIVITY[r.item_name];

              if (bought >= 100 && sold === 0) sinks.push({ item_name: r.item_name, bought, sold });
              const produced = bought + crafted + from_boxes;
              if (sold > produced + 50 && sold > 100) {
                dupeSuspects.push({ item_name: r.item_name, sold, produced, delta: sold - produced });
              }
              if (!cfg && revenue > 0) {
                uncategorized.push({ item_name: r.item_name, revenue, total_tx });
              }
            }

            sinks.sort((a, b) => b.bought - a.bought);
            dupeSuspects.sort((a, b) => b.delta - a.delta);
            uncategorized.sort((a, b) => b.revenue - a.revenue);

            // $/h outliers per (player, activity) — flag players whose rate > 5x median.
            const playerRates = await getAll(
              db,
              `SELECT player_name, LOWER(action) AS activity,
                      COUNT(*) AS buckets
               FROM (
                 SELECT action, player_name, timestamp
                 FROM logs
                 WHERE category = 'harvest'
                   AND action IN ('Mine','Farm','Wood','Mob','Fish')
                   AND timestamp >= ? AND player_name IS NOT NULL ${sWhere}
                 GROUP BY action, player_name, timestamp / 60000
               )
               GROUP BY player_name, activity
               HAVING buckets >= 5`,
              [from, ...sf.params],
            ) as Array<{ player_name: string; activity: Activity; buckets: number }>;

            const playerRevenue = await getAll(
              db,
              `SELECT player_name, item_name, SUM(${PRICE_EXTRACT}) AS revenue
               FROM logs
               WHERE category = 'economy'
                 AND action IN ('ShopSell','SellAll','MarketSell')
                 AND timestamp >= ? AND player_name IS NOT NULL
                 AND item_name IS NOT NULL AND detail LIKE '%for %' ${sWhere}
               GROUP BY player_name, item_name`,
              [from, ...sf.params],
            ) as Array<{ player_name: string; item_name: string; revenue: number }>;

            const revByPlayerActivity = new Map<string, number>();
            for (const r of playerRevenue) {
              const cfg = ITEM_ACTIVITY[r.item_name];
              if (cfg?.role !== "output") continue;
              const key = `${r.player_name}|${cfg.activity}`;
              revByPlayerActivity.set(key, (revByPlayerActivity.get(key) ?? 0) + Number(r.revenue));
            }

            const ratesByActivity: Record<Activity, number[]> = { mine: [], farm: [], wood: [], mob: [], fish: [] };
            const perPlayer: Array<{ player_name: string; activity: Activity; hours: number; revenue: number; rate: number }> = [];
            for (const p of playerRates) {
              const hours = p.buckets * 60 / 3600;
              if (hours <= 0) continue;
              const rev = revByPlayerActivity.get(`${p.player_name}|${p.activity}`) ?? 0;
              if (rev <= 0) continue;
              const rate = rev / hours;
              ratesByActivity[p.activity].push(rate);
              perPlayer.push({ player_name: p.player_name, activity: p.activity, hours, revenue: rev, rate });
            }

            const median = (arr: number[]): number => {
              if (arr.length === 0) return 0;
              const sorted = [...arr].sort((a, b) => a - b);
              const mid = Math.floor(sorted.length / 2);
              return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
            };
            const medians = {} as Record<Activity, number>;
            for (const a of ACTIVITIES) medians[a] = median(ratesByActivity[a]);

            const outliers = perPlayer
              .filter((p) => medians[p.activity] > 0 && p.rate > medians[p.activity] * 5)
              .sort((a, b) => b.rate - a.rate)
              .slice(0, 15)
              .map((p) => ({ ...p, median: medians[p.activity], multiple: p.rate / medians[p.activity] }));

            return {
              outliers,
              sinks: sinks.slice(0, 15),
              dupe_suspects: dupeSuspects.slice(0, 15),
              uncategorized: uncategorized.slice(0, 20),
            };
          }),
        );
      }

      // ==================== BOXES ====================
      case "stats/boxes": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const sid = q.get("server_id");
            const sf = serverFilter(sid);
            const wCat = sf.where ? `WHERE category = 'box' AND ${sf.where}` : "WHERE category = 'box'";
            const wCatAnd = sf.where ? `WHERE category = 'box' AND ${sf.where} AND` : "WHERE category = 'box' AND";
            const now = Date.now();

            // Fused counts: one query instead of 4.
            const counts = (await getOne(
              db,
              `SELECT
                COUNT(*) AS totalOpened,
                SUM(CASE WHEN timestamp > ? THEN 1 ELSE 0 END) AS openedLast24h,
                SUM(CASE WHEN timestamp > ? THEN 1 ELSE 0 END) AS openedLast7d,
                COUNT(DISTINCT player_uuid) AS uniquePlayers
               FROM logs ${wCat}`,
              [now - DAY_MS, now - 7 * DAY_MS, ...sf.params],
            )) as Record<string, number> | null;

            const [topBoxTypes, topRewards, topOpeners] = await Promise.all([
              getAll(
                db,
                `SELECT action as box_type, COUNT(*) as open_count, COUNT(DISTINCT player_uuid) as unique_players
                 FROM logs ${wCat} GROUP BY action ORDER BY open_count DESC LIMIT 20`,
                sf.params,
              ),
              getAll(
                db,
                `SELECT item_name, SUM(COALESCE(item_count, 1)) as total_qty, COUNT(*) as times_obtained
                 FROM logs ${wCatAnd} item_name IS NOT NULL AND item_name != ''
                 GROUP BY item_name ORDER BY times_obtained DESC LIMIT 20`,
                sf.params,
              ),
              getAll(
                db,
                `SELECT player_name, COUNT(*) as open_count FROM logs ${wCatAnd} player_name IS NOT NULL
                 GROUP BY player_name ORDER BY open_count DESC LIMIT 10`,
                sf.params,
              ),
            ]);

            return {
              totalOpened: counts?.totalOpened ?? 0,
              openedLast24h: counts?.openedLast24h ?? 0,
              openedLast7d: counts?.openedLast7d ?? 0,
              uniquePlayers: counts?.uniquePlayers ?? 0,
              topBoxTypes,
              topRewards,
              topOpeners,
            };
          }),
        );
      }

      case "stats/boxes/daily": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const days = Number(q.get("days")) || 30;
            const sid = q.get("server_id");
            const now = Date.now();
            const from = now - days * DAY_MS;
            const sf = serverFilter(sid);
            const sWhere = sf.where ? `AND ${sf.where}` : "";
            const rows = await getAll(
              db,
              `SELECT CAST((? - timestamp) / ? AS INTEGER) AS days_ago,
                COUNT(*) AS opens, COUNT(DISTINCT player_uuid) AS players
               FROM logs WHERE category = 'box' AND timestamp >= ? ${sWhere}
               GROUP BY days_ago`,
              [now, DAY_MS, from, ...sf.params],
            );
            return fillDailyBuckets(rows, days, now, { opens: 0, players: 0 });
          }),
        );
      }

      case "servers": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL * 4, () =>
            getAll(db, "SELECT * FROM servers ORDER BY server_name"),
          ),
        );
      }

      // ==================== STAFF ====================
      case "staff/overview": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const now = Date.now();
            const from = q.get("from") ? Number(q.get("from")) : null;
            const to = q.get("to") ? Number(q.get("to")) : null;
            const rangeWhere = from && to ? "WHERE timestamp BETWEEN ? AND ?" : "";
            const rangeParams = from && to ? [from, to] : [];

            // Fuse 12 scalars into a single query.
            const row = (await getOne(
              db,
              `SELECT
                COUNT(*) AS totalActions,
                SUM(CASE WHEN timestamp > ? THEN 1 ELSE 0 END) AS actionsToday,
                SUM(CASE WHEN timestamp > ? THEN 1 ELSE 0 END) AS actionsWeek,
                COUNT(DISTINCT staff_id) AS uniqueStaff,
                SUM(CASE WHEN action = 'mute' THEN 1 ELSE 0 END) AS totalMutes,
                SUM(CASE WHEN action = 'ban' THEN 1 ELSE 0 END) AS totalBans,
                SUM(CASE WHEN action = 'kick' THEN 1 ELSE 0 END) AS totalKicks,
                SUM(CASE WHEN action = 'unmute' THEN 1 ELSE 0 END) AS totalUnmutes,
                SUM(CASE WHEN action = 'jail' THEN 1 ELSE 0 END) AS totalJails,
                SUM(CASE WHEN action = 'ticket_close' THEN 1 ELSE 0 END) AS totalTicketClose,
                SUM(CASE WHEN action = 'ticket_message' THEN 1 ELSE 0 END) AS totalTicketMessage,
                SUM(CASE WHEN action = 'ticket_summary' THEN 1 ELSE 0 END) AS totalTicketSummary
               FROM staff_actions ${rangeWhere}`,
              [now - DAY_MS, now - 7 * DAY_MS, ...rangeParams],
            )) as Record<string, number> | null;

            return {
              totalActions: row?.totalActions ?? 0,
              actionsToday: row?.actionsToday ?? 0,
              actionsWeek: row?.actionsWeek ?? 0,
              uniqueStaff: row?.uniqueStaff ?? 0,
              totalMutes: row?.totalMutes ?? 0,
              totalBans: row?.totalBans ?? 0,
              totalKicks: row?.totalKicks ?? 0,
              totalUnmutes: row?.totalUnmutes ?? 0,
              totalJails: row?.totalJails ?? 0,
              totalTicketClose: row?.totalTicketClose ?? 0,
              totalTicketMessage: row?.totalTicketMessage ?? 0,
              totalTicketSummary: row?.totalTicketSummary ?? 0,
            };
          }),
        );
      }

      case "staff/leaderboard": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const limit = Number(q.get("limit")) || 50;
            const from = q.get("from") ? Number(q.get("from")) : null;
            const to = q.get("to") ? Number(q.get("to")) : null;
            const rangeWhere = from && to ? "WHERE timestamp BETWEEN ? AND ?" : "";
            const rangeParams = from && to ? [from, to] : [];
            return getAll(
              db,
              `SELECT staff_id, staff_name, COUNT(*) as total_actions,
                SUM(CASE WHEN action = 'mute' THEN 1 ELSE 0 END) as mutes,
                SUM(CASE WHEN action = 'ban' THEN 1 ELSE 0 END) as bans,
                SUM(CASE WHEN action = 'kick' THEN 1 ELSE 0 END) as kicks,
                SUM(CASE WHEN action = 'unmute' THEN 1 ELSE 0 END) as unmutes,
                SUM(CASE WHEN action = 'jail' THEN 1 ELSE 0 END) as jails,
                SUM(CASE WHEN action = 'ticket_close' THEN 1 ELSE 0 END) as ticket_closes,
                SUM(CASE WHEN action = 'ticket_message' THEN 1 ELSE 0 END) as ticket_messages,
                SUM(CASE WHEN action = 'ticket_summary' THEN 1 ELSE 0 END) as ticket_summaries
              FROM staff_actions ${rangeWhere} GROUP BY staff_id ORDER BY total_actions DESC LIMIT ?`,
              [...rangeParams, limit],
            );
          }),
        );
      }

      case "staff/daily-activity": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const days = Number(q.get("days")) || 30;
            const now = Date.now();
            const from = q.get("from") ? Number(q.get("from")) : null;
            const to = q.get("to") ? Number(q.get("to")) : null;

            if (from && to) {
              // Explicit range: one grouped query keyed off `from`.
              const rows = await getAll(
                db,
                `SELECT CAST((timestamp - ?) / ? AS INTEGER) AS day_idx, COUNT(*) AS actions
                 FROM staff_actions WHERE timestamp BETWEEN ? AND ?
                 GROUP BY day_idx`,
                [from, DAY_MS, from, to],
              );
              const byIdx = new Map<number, number>();
              for (const r of rows) byIdx.set(Number(r.day_idx), Number(r.actions) || 0);
              const totalDays = Math.ceil((to - from) / DAY_MS);
              const out = [];
              for (let i = 0; i < totalDays; i++) {
                const dayStart = from + i * DAY_MS;
                out.push({
                  date: new Date(dayStart).toISOString().split("T")[0],
                  actions: byIdx.get(i) ?? 0,
                });
              }
              return out;
            }

            const fromTs = now - days * DAY_MS;
            const rows = await getAll(
              db,
              `SELECT CAST((? - timestamp) / ? AS INTEGER) AS days_ago, COUNT(*) AS actions
               FROM staff_actions WHERE timestamp >= ?
               GROUP BY days_ago`,
              [now, DAY_MS, fromTs],
            );
            return fillDailyBuckets(rows, days, now, { actions: 0 });
          }),
        );
      }

      case "staff/actions-breakdown": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const from = q.get("from") ? Number(q.get("from")) : null;
            const to = q.get("to") ? Number(q.get("to")) : null;
            const rangeWhere = from && to ? "WHERE timestamp BETWEEN ? AND ?" : "";
            const rangeParams = from && to ? [from, to] : [];
            return getAll(
              db,
              `SELECT action, COUNT(*) as count FROM staff_actions ${rangeWhere} GROUP BY action ORDER BY count DESC`,
              rangeParams,
            );
          }),
        );
      }

      case "staff/recent": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const limit = Number(q.get("limit")) || 50;
            const from = q.get("from") ? Number(q.get("from")) : null;
            const to = q.get("to") ? Number(q.get("to")) : null;
            const rangeWhere = from && to ? "WHERE timestamp BETWEEN ? AND ?" : "";
            const rangeParams = from && to ? [from, to] : [];
            return getAll(
              db,
              `SELECT * FROM staff_actions ${rangeWhere} ORDER BY timestamp DESC LIMIT ?`,
              [...rangeParams, limit],
            );
          }),
        );
      }

      default: {
        // Handle players/:uuid
        if (path[0] === "players" && path.length === 2) {
          const result = await cached(cacheKey, CACHE_TTL, async () => {
              const uuid = path[1];
              const sid = q.get("server_id");
              const player = await getOne(db, "SELECT * FROM players WHERE uuid = ?", [uuid]);
              if (!player) return { error: "Player not found", __status: 404 } as const;
              const sf = serverFilter(sid);
              const sWhere = sf.where ? `AND ${sf.where}` : "";

              // Parallelize the 10 independent reads — same query count, but
              // dispatched in one go so they share the client round-trip slot.
              const [
                aliases, sessions, commands, worlds, deaths, messages,
                commandStats, worldStats, casinoStats, casinoHistory, sanctions,
                profileExtra, cosmetics, account, staff,
              ] = await Promise.all([
                getAll(
                  db,
                  `SELECT alias_uuid, alias_name, alias_xuid,
                     GROUP_CONCAT(DISTINCT match_via) AS match_via,
                     MAX(updated_at) AS updated_at
                   FROM (
                     SELECT alias_uuid, alias_name, alias_xuid, match_via, updated_at FROM player_aliases WHERE player_uuid = ?
                     UNION ALL
                     SELECT player_uuid AS alias_uuid, player_name AS alias_name, NULL AS alias_xuid, match_via, updated_at FROM player_aliases WHERE alias_uuid = ?
                   )
                   GROUP BY alias_uuid
                   ORDER BY updated_at DESC`,
                  [uuid, uuid],
                ),
                getAll(db, `SELECT * FROM sessions WHERE player_uuid = ? ${sWhere} ORDER BY join_time DESC LIMIT 50`, [uuid, ...sf.params]),
                getAll(db, `SELECT action as command, detail as arguments, world, timestamp, server_id FROM logs WHERE player_uuid = ? AND category = 'command' ${sWhere} ORDER BY timestamp DESC LIMIT 100`, [uuid, ...sf.params]),
                getAll(db, `SELECT * FROM world_visits WHERE player_uuid = ? ${sWhere} ORDER BY enter_time DESC LIMIT 100`, [uuid, ...sf.params]),
                getAll(db, `SELECT detail as cause, world, x, y, z, timestamp, server_id FROM logs WHERE player_uuid = ? AND category = 'death' AND action = 'Death' ${sWhere} ORDER BY timestamp DESC LIMIT 50`, [uuid, ...sf.params]),
                getAll(db, `SELECT detail as message, world, timestamp, server_id FROM logs WHERE player_uuid = ? AND category = 'chat' ${sWhere} ORDER BY timestamp DESC LIMIT 100`, [uuid, ...sf.params]),
                getAll(db, `SELECT action as command, COUNT(*) as count FROM logs WHERE player_uuid = ? AND category = 'command' ${sWhere} GROUP BY action ORDER BY count DESC LIMIT 20`, [uuid, ...sf.params]),
                getAll(db, `SELECT world_name, SUM(duration) as total_time, COUNT(*) as visits FROM world_visits WHERE player_uuid = ? ${sWhere} GROUP BY world_name ORDER BY total_time DESC`, [uuid, ...sf.params]),
                getOne(db, `SELECT COUNT(*) as total_bets, COALESCE(SUM(bet_amount),0) as total_bet, COALESCE(SUM(win_amount),0) as total_won, COALESCE(SUM(net_result),0) as net FROM casino_transactions WHERE player_uuid = ? ${sWhere}`, [uuid, ...sf.params]),
                getAll(db, `SELECT * FROM casino_transactions WHERE player_uuid = ? ${sWhere} ORDER BY timestamp DESC LIMIT 50`, [uuid, ...sf.params]),
                getAll(db, `SELECT * FROM sanctions WHERE player_uuid = ? ORDER BY timestamp DESC`, [uuid]),
                getOne(db, `SELECT rank, prestige, money, kills, deaths, killstreak, jobs, join_count, first_join, last_leave, updated_at FROM player_profile_extra WHERE uuid = ? OR xuid = ? LIMIT 1`, [uuid, (player as Record<string, unknown>).xuid ?? ""]),
                getAll(db, `SELECT type, identifier, name, active FROM player_cosmetics WHERE xuid = ? ORDER BY active DESC, type, name`, [(player as Record<string, unknown>).xuid ?? ""]),
                getOne(db, `SELECT id, microsoft_id, microsoft_gamertag, microsoft_display_name, display_name, created_at, last_login FROM player_accounts WHERE linked_player_uuid = ? OR linked_player_uuid = ? LIMIT 1`, [uuid, (player as Record<string, unknown>).xuid ?? ""]),
                getOne(db, `SELECT id, role, source, discord_id, discord_username, discord_avatar, microsoft_gamertag, display_name FROM staff_users WHERE linked_xuid = ? OR microsoft_id = ? LIMIT 1`, [(player as Record<string, unknown>).xuid ?? "", (player as Record<string, unknown>).xuid ?? ""]),
              ]);

              return {
                player, sessions, commands, worlds, deaths, messages,
                commandStats, worldStats, casinoStats, casinoHistory, sanctions, aliases,
                profileExtra, cosmetics, account, staff,
              };
          });
          const maybeErr = result as unknown as { __status?: number; error?: string };
          if (maybeErr && maybeErr.__status) {
            return NextResponse.json({ error: maybeErr.error }, { status: maybeErr.__status });
          }
          return NextResponse.json(result);
        }
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }
  } catch (err) {
    console.error("Analytics error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
