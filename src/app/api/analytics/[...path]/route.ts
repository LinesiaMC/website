import { NextRequest, NextResponse } from "next/server";
import { getDb, getOne, getAll, serverFilter } from "@/lib/analytics-db";
import { ADMIN_PASSWORD } from "@/lib/admin-config";

function checkAuth(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${ADMIN_PASSWORD}`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path } = await params;
  const route = path.join("/");
  const q = req.nextUrl.searchParams;
  const db = await getDb();

  try {
    switch (route) {
      // ==================== STATS ====================
      case "stats/overview": {
        const now = Date.now(), day = 86400000, week = 7 * day;
        const sid = q.get("server_id");
        if (sid && sid !== "all") {
          return NextResponse.json({
            totalPlayers: (getOne(db, "SELECT COUNT(DISTINCT player_uuid) as count FROM sessions WHERE server_id = ?", [sid]) as Record<string,number>).count,
            activeLast24h: (getOne(db, "SELECT COUNT(DISTINCT player_uuid) as count FROM sessions WHERE server_id = ? AND join_time > ?", [sid, now - day]) as Record<string,number>).count,
            activeLast7d: (getOne(db, "SELECT COUNT(DISTINCT player_uuid) as count FROM sessions WHERE server_id = ? AND join_time > ?", [sid, now - week]) as Record<string,number>).count,
            newLast24h: (getOne(db, "SELECT COUNT(*) as count FROM players WHERE first_seen > ?", [now - day]) as Record<string,number>).count,
            newLast7d: (getOne(db, "SELECT COUNT(*) as count FROM players WHERE first_seen > ?", [now - week]) as Record<string,number>).count,
            totalCommands: (getOne(db, "SELECT COUNT(*) as count FROM commands WHERE server_id = ?", [sid]) as Record<string,number>).count,
            totalDeaths: (getOne(db, "SELECT COUNT(*) as count FROM deaths WHERE server_id = ?", [sid]) as Record<string,number>).count,
            totalMessages: (getOne(db, "SELECT COUNT(*) as count FROM chat_messages WHERE server_id = ?", [sid]) as Record<string,number>).count,
            avgPlaytime: Math.round((getOne(db, "SELECT AVG(total_playtime) as avg FROM players WHERE total_playtime > 0") as Record<string,number>)?.avg || 0),
            avgSessionCount: Math.round(((getOne(db, "SELECT AVG(session_count) as avg FROM players") as Record<string,number>)?.avg || 0) * 10) / 10,
          });
        }
        return NextResponse.json({
          totalPlayers: (getOne(db, "SELECT COUNT(*) as count FROM players") as Record<string,number>).count,
          activeLast24h: (getOne(db, "SELECT COUNT(*) as count FROM players WHERE last_seen > ?", [now - day]) as Record<string,number>).count,
          activeLast7d: (getOne(db, "SELECT COUNT(*) as count FROM players WHERE last_seen > ?", [now - week]) as Record<string,number>).count,
          newLast24h: (getOne(db, "SELECT COUNT(*) as count FROM players WHERE first_seen > ?", [now - day]) as Record<string,number>).count,
          newLast7d: (getOne(db, "SELECT COUNT(*) as count FROM players WHERE first_seen > ?", [now - week]) as Record<string,number>).count,
          totalCommands: (getOne(db, "SELECT COUNT(*) as count FROM commands") as Record<string,number>).count,
          totalDeaths: (getOne(db, "SELECT COUNT(*) as count FROM deaths") as Record<string,number>).count,
          totalMessages: (getOne(db, "SELECT COUNT(*) as count FROM chat_messages") as Record<string,number>).count,
          avgPlaytime: Math.round((getOne(db, "SELECT AVG(total_playtime) as avg FROM players WHERE total_playtime > 0") as Record<string,number>)?.avg || 0),
          avgSessionCount: Math.round(((getOne(db, "SELECT AVG(session_count) as avg FROM players") as Record<string,number>)?.avg || 0) * 10) / 10,
        });
      }

      case "stats/daily-players": {
        const days = Number(q.get("days")) || 30;
        const sid = q.get("server_id");
        const now = Date.now(), day = 86400000;
        const sf = serverFilter(sid);
        const sWhere = sf.where ? `AND ${sf.where}` : "";
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
          const dayStart = now - (i + 1) * day, dayEnd = now - i * day;
          result.push({
            date: new Date(dayStart).toISOString().split("T")[0],
            activePlayers: (getOne(db, `SELECT COUNT(DISTINCT player_uuid) as count FROM sessions WHERE join_time BETWEEN ? AND ? ${sWhere}`, [dayStart, dayEnd, ...sf.params]) as Record<string,number>).count,
            newPlayers: (getOne(db, "SELECT COUNT(*) as count FROM players WHERE first_seen BETWEEN ? AND ?", [dayStart, dayEnd]) as Record<string,number>).count,
          });
        }
        return NextResponse.json(result);
      }

      case "stats/platforms": {
        const sid = q.get("server_id");
        if (sid && sid !== "all") {
          return NextResponse.json(getAll(db, `SELECT p.platform, COUNT(DISTINCT p.uuid) as count FROM players p INNER JOIN sessions s ON s.player_uuid = p.uuid WHERE s.server_id = ? GROUP BY p.platform ORDER BY count DESC`, [sid]));
        }
        return NextResponse.json(getAll(db, "SELECT platform, COUNT(*) as count FROM players GROUP BY platform ORDER BY count DESC"));
      }

      case "stats/churn": {
        const now = Date.now(), day = 86400000;
        const brackets = [
          { label: "Actif (< 1 jour)", min: 0, max: day },
          { label: "Recent (1-3 jours)", min: day, max: 3 * day },
          { label: "A risque (3-7 jours)", min: 3 * day, max: 7 * day },
          { label: "Inactif (7-30 jours)", min: 7 * day, max: 30 * day },
          { label: "Perdu (30+ jours)", min: 30 * day, max: Infinity },
        ];
        return NextResponse.json(brackets.map(b => ({
          label: b.label,
          count: b.max === Infinity
            ? (getOne(db, "SELECT COUNT(*) as count FROM players WHERE ? - last_seen >= ?", [now, b.min]) as Record<string,number>).count
            : (getOne(db, "SELECT COUNT(*) as count FROM players WHERE ? - last_seen >= ? AND ? - last_seen < ?", [now, b.min, now, b.max]) as Record<string,number>).count,
        })));
      }

      case "stats/commands": {
        const sid = q.get("server_id");
        const limit = Number(q.get("limit")) || 20;
        const sf = serverFilter(sid);
        const where = sf.where ? `WHERE ${sf.where}` : "";
        return NextResponse.json(getAll(db, `SELECT command, COUNT(*) as count FROM commands ${where} GROUP BY command ORDER BY count DESC LIMIT ?`, [...sf.params, limit]));
      }

      case "stats/peak-hours": {
        const sid = q.get("server_id");
        const sf = serverFilter(sid);
        const where = sf.where ? `WHERE ${sf.where}` : "";
        return NextResponse.json(getAll(db, `SELECT (join_time / 3600000 % 24) as hour, COUNT(*) as count FROM sessions ${where} GROUP BY hour ORDER BY hour`, sf.params));
      }

      case "stats/retention": {
        const days = Number(q.get("days")) || 30;
        const sid = q.get("server_id");
        const now = Date.now(), day = 86400000;
        const sf = serverFilter(sid, "s");
        const sJoin = sf.where ? `AND ${sf.where}` : "";
        const retention = [];
        for (let i = 0; i < days; i++) {
          const dayStart = now - (i + 1) * day, dayEnd = now - i * day;
          const joined = (getOne(db, "SELECT COUNT(*) as count FROM players WHERE first_seen BETWEEN ? AND ?", [dayStart, dayEnd]) as Record<string,number>).count;
          const returnedNextDay = (getOne(db, `SELECT COUNT(DISTINCT p.uuid) as count FROM players p INNER JOIN sessions s ON s.player_uuid = p.uuid WHERE p.first_seen BETWEEN ? AND ? AND s.join_time > ? AND s.join_time < ? ${sJoin}`, [dayStart, dayEnd, dayEnd, dayEnd + day, ...sf.params]) as Record<string,number>).count;
          const returnedWeek = (getOne(db, `SELECT COUNT(DISTINCT p.uuid) as count FROM players p INNER JOIN sessions s ON s.player_uuid = p.uuid WHERE p.first_seen BETWEEN ? AND ? AND s.join_time > ? AND s.join_time < ? ${sJoin}`, [dayStart, dayEnd, dayEnd, dayEnd + 7 * day, ...sf.params]) as Record<string,number>).count;
          retention.push({
            date: new Date(dayStart).toISOString().split("T")[0],
            newPlayers: joined, returnedDay1: returnedNextDay, returnedWeek,
            retentionDay1: joined > 0 ? Math.round((returnedNextDay / joined) * 100) : 0,
            retentionWeek: joined > 0 ? Math.round((returnedWeek / joined) * 100) : 0,
          });
        }
        return NextResponse.json(retention.reverse());
      }

      case "stats/worlds": {
        const sid = q.get("server_id");
        const sf = serverFilter(sid);
        const where = sf.where ? `WHERE ${sf.where}` : "";
        return NextResponse.json(getAll(db, `SELECT world_name, COUNT(DISTINCT player_uuid) as unique_players, COUNT(*) as total_visits, SUM(duration) as total_time FROM world_visits ${where} GROUP BY world_name ORDER BY unique_players DESC`, sf.params));
      }

      // ==================== PLAYERS ====================
      case "players": {
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
          const players = getAll(db, query, params);
          let cq = `SELECT COUNT(DISTINCT p.uuid) as count FROM players p INNER JOIN sessions s ON s.player_uuid = p.uuid WHERE s.server_id = ?`;
          const cp: unknown[] = [sid];
          if (search) { cq += " AND p.username LIKE ?"; cp.push(`%${search}%`); }
          const total = (getOne(db, cq, cp) as Record<string,number>).count;
          return NextResponse.json({ players, total });
        }

        let query = "SELECT * FROM players";
        const params: unknown[] = [];
        if (search) { query += " WHERE username LIKE ?"; params.push(`%${search}%`); }
        query += ` ORDER BY ${sortCol} ${order} LIMIT ? OFFSET ?`;
        params.push(limit, offset);
        const players = getAll(db, query, params);
        const cp = search ? [`%${search}%`] : [];
        const total = (getOne(db, `SELECT COUNT(*) as count FROM players ${search ? "WHERE username LIKE ?" : ""}`, cp) as Record<string,number>).count;
        return NextResponse.json({ players, total });
      }

      // ==================== LOGS ====================
      case "logs": {
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
        const total = (getOne(db, `SELECT COUNT(*) as count FROM logs ${wc}`, params) as Record<string,number>).count;
        const logs = getAll(db, `SELECT * FROM logs ${wc} ORDER BY timestamp DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
        return NextResponse.json({ logs, total });
      }

      case "logs/categories": {
        const sid = q.get("server_id");
        const sf = serverFilter(sid);
        const where = sf.where ? `WHERE ${sf.where}` : "";
        return NextResponse.json(getAll(db, `SELECT category, COUNT(*) as count FROM logs ${where} GROUP BY category ORDER BY count DESC`, sf.params));
      }

      case "logs/stats": {
        const sid = q.get("server_id");
        const now = Date.now(), day = 86400000;
        const sf = serverFilter(sid);
        const w = sf.where ? `WHERE ${sf.where}` : "";
        const wAnd = sf.where ? `WHERE ${sf.where} AND` : "WHERE";
        return NextResponse.json({
          totalLogs: (getOne(db, `SELECT COUNT(*) as count FROM logs ${w}`, sf.params) as Record<string,number>).count,
          logsLast24h: (getOne(db, `SELECT COUNT(*) as count FROM logs ${wAnd} timestamp > ?`, [...sf.params, now - day]) as Record<string,number>).count,
          warnings: (getOne(db, `SELECT COUNT(*) as count FROM logs ${wAnd} level = 'warning'`, sf.params) as Record<string,number>).count,
          warningsLast24h: (getOne(db, `SELECT COUNT(*) as count FROM logs ${wAnd} level = 'warning' AND timestamp > ?`, [...sf.params, now - day]) as Record<string,number>).count,
          topPlayers: getAll(db, `SELECT player_name, COUNT(*) as count FROM logs ${wAnd} player_name IS NOT NULL GROUP BY player_name ORDER BY count DESC LIMIT 10`, sf.params),
          topItems: getAll(db, `SELECT item_name, COUNT(*) as count FROM logs ${wAnd} item_name IS NOT NULL AND item_name != '' GROUP BY item_name ORDER BY count DESC LIMIT 10`, sf.params),
          topActions: getAll(db, `SELECT action, COUNT(*) as count FROM logs ${w} GROUP BY action ORDER BY count DESC LIMIT 10`, sf.params),
        });
      }

      // ==================== CASINO ====================
      case "stats/casino": {
        const now = Date.now(), day = 86400000, week = 7 * day;
        const sid = q.get("server_id");
        const sf = serverFilter(sid);
        const w = sf.where ? `WHERE ${sf.where}` : "";
        const wAnd = sf.where ? `WHERE ${sf.where} AND` : "WHERE";

        return NextResponse.json({
          totalBets: (getOne(db, `SELECT COUNT(*) as count FROM casino_transactions ${w}`, sf.params) as Record<string, number>).count,
          totalBetAmount: (getOne(db, `SELECT COALESCE(SUM(bet_amount), 0) as total FROM casino_transactions ${w}`, sf.params) as Record<string, number>).total,
          totalWinAmount: (getOne(db, `SELECT COALESCE(SUM(win_amount), 0) as total FROM casino_transactions ${w}`, sf.params) as Record<string, number>).total,
          totalNetResult: (getOne(db, `SELECT COALESCE(SUM(net_result), 0) as total FROM casino_transactions ${w}`, sf.params) as Record<string, number>).total,
          uniquePlayers: (getOne(db, `SELECT COUNT(DISTINCT player_uuid) as count FROM casino_transactions ${w}`, sf.params) as Record<string, number>).count,
          betsLast24h: (getOne(db, `SELECT COUNT(*) as count FROM casino_transactions ${wAnd} timestamp > ?`, [...sf.params, now - day]) as Record<string, number>).count,
          betsLast7d: (getOne(db, `SELECT COUNT(*) as count FROM casino_transactions ${wAnd} timestamp > ?`, [...sf.params, now - week]) as Record<string, number>).count,
          winsCount: (getOne(db, `SELECT COUNT(*) as count FROM casino_transactions ${wAnd} net_result > 0`, sf.params) as Record<string, number>).count,
          lossesCount: (getOne(db, `SELECT COUNT(*) as count FROM casino_transactions ${wAnd} net_result < 0`, sf.params) as Record<string, number>).count,
          avgBet: Math.round((getOne(db, `SELECT COALESCE(AVG(bet_amount), 0) as avg FROM casino_transactions ${w}`, sf.params) as Record<string, number>).avg),
        });
      }

      case "stats/casino/games": {
        const sid = q.get("server_id");
        const sf = serverFilter(sid);
        const w = sf.where ? `WHERE ${sf.where}` : "";
        return NextResponse.json(getAll(db,
          `SELECT game, COUNT(*) as total_bets, SUM(bet_amount) as total_bet, SUM(win_amount) as total_won, SUM(net_result) as net, COUNT(DISTINCT player_uuid) as players FROM casino_transactions ${w} GROUP BY game ORDER BY total_bets DESC`,
          sf.params));
      }

      case "stats/casino/daily": {
        const days = Number(q.get("days")) || 30;
        const sid = q.get("server_id");
        const now = Date.now(), day = 86400000;
        const sf = serverFilter(sid);
        const sWhere = sf.where ? `AND ${sf.where}` : "";
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
          const dayStart = now - (i + 1) * day, dayEnd = now - i * day;
          const row = getOne(db,
            `SELECT COUNT(*) as bets, COALESCE(SUM(bet_amount), 0) as bet_total, COALESCE(SUM(win_amount), 0) as win_total, COALESCE(SUM(net_result), 0) as net FROM casino_transactions WHERE timestamp BETWEEN ? AND ? ${sWhere}`,
            [dayStart, dayEnd, ...sf.params]) as Record<string, number>;
          result.push({
            date: new Date(dayStart).toISOString().split("T")[0],
            bets: row.bets,
            betTotal: row.bet_total,
            winTotal: row.win_total,
            net: row.net,
          });
        }
        return NextResponse.json(result);
      }

      case "stats/casino/top-players": {
        const sid = q.get("server_id");
        const limit = Number(q.get("limit")) || 10;
        const sf = serverFilter(sid, "c");
        const sJoin = sf.where ? `AND ${sf.where}` : "";
        return NextResponse.json(getAll(db,
          `SELECT c.player_uuid, p.username, COUNT(*) as total_bets, SUM(c.bet_amount) as total_bet, SUM(c.win_amount) as total_won, SUM(c.net_result) as net FROM casino_transactions c LEFT JOIN players p ON p.uuid = c.player_uuid WHERE 1=1 ${sJoin} GROUP BY c.player_uuid ORDER BY total_bets DESC LIMIT ?`,
          [...sf.params, limit]));
      }

      case "servers": {
        return NextResponse.json(getAll(db, "SELECT * FROM servers ORDER BY server_name"));
      }

      default: {
        // Handle players/:uuid
        if (path[0] === "players" && path.length === 2) {
          const uuid = path[1];
          const sid = q.get("server_id");
          const player = getOne(db, "SELECT * FROM players WHERE uuid = ?", [uuid]);
          if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
          const sf = serverFilter(sid);
          const sWhere = sf.where ? `AND ${sf.where}` : "";
          return NextResponse.json({
            player,
            sessions: getAll(db, `SELECT * FROM sessions WHERE player_uuid = ? ${sWhere} ORDER BY join_time DESC LIMIT 50`, [uuid, ...sf.params]),
            commands: getAll(db, `SELECT * FROM commands WHERE player_uuid = ? ${sWhere} ORDER BY timestamp DESC LIMIT 100`, [uuid, ...sf.params]),
            worlds: getAll(db, `SELECT * FROM world_visits WHERE player_uuid = ? ${sWhere} ORDER BY enter_time DESC LIMIT 100`, [uuid, ...sf.params]),
            deaths: getAll(db, `SELECT * FROM deaths WHERE player_uuid = ? ${sWhere} ORDER BY timestamp DESC LIMIT 50`, [uuid, ...sf.params]),
            messages: getAll(db, `SELECT * FROM chat_messages WHERE player_uuid = ? ${sWhere} ORDER BY timestamp DESC LIMIT 100`, [uuid, ...sf.params]),
            commandStats: getAll(db, `SELECT command, COUNT(*) as count FROM commands WHERE player_uuid = ? ${sWhere} GROUP BY command ORDER BY count DESC LIMIT 20`, [uuid, ...sf.params]),
            worldStats: getAll(db, `SELECT world_name, SUM(duration) as total_time, COUNT(*) as visits FROM world_visits WHERE player_uuid = ? ${sWhere} GROUP BY world_name ORDER BY total_time DESC`, [uuid, ...sf.params]),
            casinoStats: getOne(db, `SELECT COUNT(*) as total_bets, COALESCE(SUM(bet_amount),0) as total_bet, COALESCE(SUM(win_amount),0) as total_won, COALESCE(SUM(net_result),0) as net FROM casino_transactions WHERE player_uuid = ? ${sWhere}`, [uuid, ...sf.params]),
            casinoHistory: getAll(db, `SELECT * FROM casino_transactions WHERE player_uuid = ? ${sWhere} ORDER BY timestamp DESC LIMIT 50`, [uuid, ...sf.params]),
          });
        }
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }
  } catch (err) {
    console.error("Analytics error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
