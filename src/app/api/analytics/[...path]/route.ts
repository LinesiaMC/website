import { NextRequest, NextResponse } from "next/server";
import { getDb, getOne, getAll, serverFilter } from "@/lib/analytics-db";
import { cached } from "@/lib/query-cache";
import { getCurrentStaff } from "@/lib/auth";
import { hasPermission } from "@/lib/roles";

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
            if (sid && sid !== "all") {
              // One fused query for the scoped case. Uses subselects so it's
              // a single round-trip instead of 10 separate getOne calls.
              const row = (await getOne(
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
                  (SELECT AVG(session_count) FROM players) AS avgSessionCount`,
                [
                  sid,
                  sid, now - DAY_MS,
                  sid, now - 7 * DAY_MS,
                  now - DAY_MS,
                  now - 7 * DAY_MS,
                  sid,
                  sid,
                  sid,
                ],
              )) as Record<string, number> | null;
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
                avgSessionCount: Math.round(((row?.avgSessionCount ?? 0) as number) * 10) / 10,
              };
            }

            const row = (await getOne(
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
                (SELECT AVG(session_count) FROM players) AS avgSessionCount`,
              [now - DAY_MS, now - 7 * DAY_MS, now - DAY_MS, now - 7 * DAY_MS],
            )) as Record<string, number> | null;
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
              avgSessionCount: Math.round(((row?.avgSessionCount ?? 0) as number) * 10) / 10,
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
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const days = Number(q.get("days")) || 30;
            const sid = q.get("server_id");
            const now = Date.now();
            const from = now - days * DAY_MS;
            const sf = serverFilter(sid, "s");
            const sJoin = sf.where ? `AND ${sf.where}` : "";

            // joined per cohort day
            const joinedRows = await getAll(
              db,
              `SELECT CAST((? - first_seen) / ? AS INTEGER) AS days_ago, COUNT(*) AS c
               FROM players WHERE first_seen >= ? GROUP BY days_ago`,
              [now, DAY_MS, from],
            );
            // returned day+1: any session within 1 day after first_seen
            const day1Rows = await getAll(
              db,
              `SELECT CAST((? - p.first_seen) / ? AS INTEGER) AS days_ago,
                 COUNT(DISTINCT p.uuid) AS c
               FROM players p INNER JOIN sessions s ON s.player_uuid = p.uuid
               WHERE p.first_seen >= ?
                 AND s.join_time > p.first_seen
                 AND s.join_time < p.first_seen + ?
                 ${sJoin}
               GROUP BY days_ago`,
              [now, DAY_MS, from, DAY_MS, ...sf.params],
            );
            const weekRows = await getAll(
              db,
              `SELECT CAST((? - p.first_seen) / ? AS INTEGER) AS days_ago,
                 COUNT(DISTINCT p.uuid) AS c
               FROM players p INNER JOIN sessions s ON s.player_uuid = p.uuid
               WHERE p.first_seen >= ?
                 AND s.join_time > p.first_seen
                 AND s.join_time < p.first_seen + ?
                 ${sJoin}
               GROUP BY days_ago`,
              [now, DAY_MS, from, 7 * DAY_MS, ...sf.params],
            );

            const joinedByIdx = new Map<number, number>();
            const day1ByIdx = new Map<number, number>();
            const weekByIdx = new Map<number, number>();
            for (const r of joinedRows) joinedByIdx.set(Number(r.days_ago), Number(r.c) || 0);
            for (const r of day1Rows) day1ByIdx.set(Number(r.days_ago), Number(r.c) || 0);
            for (const r of weekRows) weekByIdx.set(Number(r.days_ago), Number(r.c) || 0);

            const out = [];
            for (let i = days - 1; i >= 0; i--) {
              const dayStart = now - (i + 1) * DAY_MS;
              const joined = joinedByIdx.get(i) ?? 0;
              const returnedDay1 = day1ByIdx.get(i) ?? 0;
              const returnedWeek = weekByIdx.get(i) ?? 0;
              out.push({
                date: new Date(dayStart).toISOString().split("T")[0],
                newPlayers: joined,
                returnedDay1,
                returnedWeek,
                retentionDay1: joined > 0 ? Math.round((returnedDay1 / joined) * 100) : 0,
                retentionWeek: joined > 0 ? Math.round((returnedWeek / joined) * 100) : 0,
              });
            }
            return out.reverse();
          }),
        );
      }

      case "stats/worlds": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const sid = q.get("server_id");
            const sf = serverFilter(sid);
            const where = sf.where ? `WHERE ${sf.where}` : "";
            return getAll(
              db,
              `SELECT world_name, COUNT(DISTINCT player_uuid) as unique_players,
                COUNT(*) as total_visits, SUM(duration) as total_time
               FROM world_visits ${where} GROUP BY world_name ORDER BY unique_players DESC`,
              sf.params,
            );
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

      case "stats/economy/top-items": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const sid = q.get("server_id");
            const sf = serverFilter(sid);
            const wCat = sf.where ? `WHERE category = 'economy' AND ${sf.where}` : "WHERE category = 'economy'";
            return getAll(
              db,
              `SELECT item_name, action, COUNT(*) as tx_count, SUM(item_count) as total_qty
               FROM logs ${wCat} AND item_name IS NOT NULL AND item_name != ''
               GROUP BY item_name, action ORDER BY tx_count DESC LIMIT 30`,
              sf.params,
            );
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

      case "stats/economy/top-spenders": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const sid = q.get("server_id");
            const limit = Number(q.get("limit")) || 10;
            const sf = serverFilter(sid);
            const wCat = sf.where ? `WHERE category = 'economy' AND ${sf.where}` : "WHERE category = 'economy'";
            return getAll(
              db,
              `SELECT player_name, COUNT(*) as tx_count,
                SUM(CASE WHEN action = 'ShopBuy' THEN 1 ELSE 0 END) as buys,
                SUM(CASE WHEN action IN ('ShopSell','SellAll') THEN 1 ELSE 0 END) as sells,
                SUM(CASE WHEN action = 'Pay' THEN 1 ELSE 0 END) as pays
               FROM logs ${wCat} AND player_name IS NOT NULL
               GROUP BY player_name ORDER BY tx_count DESC LIMIT ?`,
              [...sf.params, limit],
            );
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

      // ==================== ITEMS CIRCULATION ====================
      case "stats/items/circulation": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const sid = q.get("server_id");
            const search = q.get("search");
            const limit = Number(q.get("limit")) || 50;
            const sf = serverFilter(sid);

            const items = await getAll(
              db,
              `SELECT
                item_name,
                SUM(CASE WHEN action IN ('ShopBuy', 'MarketBuy') THEN COALESCE(item_count, 1) ELSE 0 END) as bought,
                SUM(CASE WHEN action IN ('ShopSell', 'SellAll', 'MarketSell') THEN COALESCE(item_count, 1) ELSE 0 END) as sold,
                SUM(CASE WHEN action = 'Craft' THEN COALESCE(item_count, 1) ELSE 0 END) as crafted,
                SUM(CASE WHEN action = 'BoxOpen' THEN COALESCE(item_count, 1) ELSE 0 END) as from_boxes,
                COUNT(*) as total_tx
               FROM logs
               ${sf.where ? `WHERE ${sf.where} AND` : "WHERE"}
                 item_name IS NOT NULL AND item_name != ''
                 AND category IN ('economy', 'craft', 'box')
                 ${search ? "AND item_name LIKE ?" : ""}
               GROUP BY item_name
               ORDER BY total_tx DESC
               LIMIT ?`,
              [...sf.params, ...(search ? [`%${search}%`] : []), limit],
            );

            // Fuse the two summary counts into a single query.
            const sum = (await getOne(
              db,
              `SELECT COUNT(DISTINCT item_name) AS totalUniqueItems, COUNT(*) AS totalTransactions
               FROM logs
               ${sf.where ? `WHERE ${sf.where} AND` : "WHERE"}
                 item_name IS NOT NULL AND item_name != ''
                 AND category IN ('economy', 'craft', 'box')`,
              sf.params,
            )) as Record<string, number> | null;

            return {
              items,
              totalUniqueItems: sum?.totalUniqueItems ?? 0,
              totalTransactions: sum?.totalTransactions ?? 0,
            };
          }),
        );
      }

      case "stats/items/daily": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const days = Number(q.get("days")) || 14;
            const itemName = q.get("item");
            const sid = q.get("server_id");
            const now = Date.now();
            const from = now - days * DAY_MS;
            const sf = serverFilter(sid);
            const sWhere = sf.where ? `AND ${sf.where}` : "";
            const itemFilter = itemName ? "AND item_name = ?" : "";
            const rows = await getAll(
              db,
              `SELECT CAST((? - timestamp) / ? AS INTEGER) AS days_ago,
                SUM(CASE WHEN action IN ('ShopBuy','MarketBuy') THEN COALESCE(item_count,1) ELSE 0 END) AS bought,
                SUM(CASE WHEN action IN ('ShopSell','SellAll','MarketSell') THEN COALESCE(item_count,1) ELSE 0 END) AS sold,
                SUM(CASE WHEN action = 'Craft' THEN COALESCE(item_count,1) ELSE 0 END) AS crafted
               FROM logs
               WHERE timestamp >= ? ${sWhere}
                 AND item_name IS NOT NULL
                 AND category IN ('economy','craft','box')
                 ${itemFilter}
               GROUP BY days_ago`,
              [now, DAY_MS, from, ...sf.params, ...(itemName ? [itemName] : [])],
            );
            return fillDailyBuckets(rows, days, now, { bought: 0, sold: 0, crafted: 0 });
          }),
        );
      }

      case "stats/items/avg-price": {
        return NextResponse.json(
          await cached(cacheKey, CACHE_TTL, async () => {
            const sid = q.get("server_id");
            const sf = serverFilter(sid);
            const sWhere = sf.where ? `AND ${sf.where}` : "";
            return getAll(
              db,
              `SELECT
                item_name,
                ROUND(AVG(CAST(SUBSTR(detail, INSTR(detail, 'for ') + 4,
                  CASE WHEN INSTR(SUBSTR(detail, INSTR(detail, 'for ') + 4), ' ') > 0
                    THEN INSTR(SUBSTR(detail, INSTR(detail, 'for ') + 4), ' ') - 1
                    ELSE LENGTH(SUBSTR(detail, INSTR(detail, 'for ') + 4))
                  END) AS REAL)), 2) as avg_price,
                COUNT(*) as tx_count
              FROM logs
              WHERE category = 'economy'
                AND action IN ('ShopBuy', 'ShopSell', 'SellAll', 'MarketBuy', 'MarketSell')
                AND item_name IS NOT NULL AND item_name != ''
                AND detail LIKE '%for %'
                ${sWhere}
              GROUP BY item_name
              ORDER BY tx_count DESC`,
              sf.params,
            );
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
              ]);

              return {
                player, sessions, commands, worlds, deaths, messages,
                commandStats, worldStats, casinoStats, casinoHistory, sanctions, aliases,
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
