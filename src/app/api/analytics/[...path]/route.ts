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
            totalPlayers: ((await getOne(db, "SELECT COUNT(DISTINCT player_uuid) as count FROM sessions WHERE server_id = ?", [sid])) as Record<string,number>).count,
            activeLast24h: ((await getOne(db, "SELECT COUNT(DISTINCT player_uuid) as count FROM sessions WHERE server_id = ? AND join_time > ?", [sid, now - day])) as Record<string,number>).count,
            activeLast7d: ((await getOne(db, "SELECT COUNT(DISTINCT player_uuid) as count FROM sessions WHERE server_id = ? AND join_time > ?", [sid, now - week])) as Record<string,number>).count,
            newLast24h: ((await getOne(db, "SELECT COUNT(*) as count FROM players WHERE first_seen > ?", [now - day])) as Record<string,number>).count,
            newLast7d: ((await getOne(db, "SELECT COUNT(*) as count FROM players WHERE first_seen > ?", [now - week])) as Record<string,number>).count,
            totalCommands: ((await getOne(db, "SELECT COUNT(*) as count FROM logs WHERE category = 'command' AND server_id = ?", [sid])) as Record<string,number>).count,
            totalDeaths: ((await getOne(db, "SELECT COUNT(*) as count FROM logs WHERE category = 'death' AND action = 'Death' AND server_id = ?", [sid])) as Record<string,number>).count,
            totalMessages: ((await getOne(db, "SELECT COUNT(*) as count FROM logs WHERE category = 'chat' AND server_id = ?", [sid])) as Record<string,number>).count,
            avgPlaytime: Math.round(((await getOne(db, "SELECT AVG(total_playtime) as avg FROM players WHERE total_playtime > 0")) as Record<string,number>)?.avg || 0),
            avgSessionCount: Math.round((((await getOne(db, "SELECT AVG(session_count) as avg FROM players")) as Record<string,number>)?.avg || 0) * 10) / 10,
          });
        }
        return NextResponse.json({
          totalPlayers: ((await getOne(db, "SELECT COUNT(*) as count FROM players")) as Record<string,number>).count,
          activeLast24h: ((await getOne(db, "SELECT COUNT(*) as count FROM players WHERE last_seen > ?", [now - day])) as Record<string,number>).count,
          activeLast7d: ((await getOne(db, "SELECT COUNT(*) as count FROM players WHERE last_seen > ?", [now - week])) as Record<string,number>).count,
          newLast24h: ((await getOne(db, "SELECT COUNT(*) as count FROM players WHERE first_seen > ?", [now - day])) as Record<string,number>).count,
          newLast7d: ((await getOne(db, "SELECT COUNT(*) as count FROM players WHERE first_seen > ?", [now - week])) as Record<string,number>).count,
          totalCommands: ((await getOne(db, "SELECT COUNT(*) as count FROM logs WHERE category = 'command'")) as Record<string,number>).count,
          totalDeaths: ((await getOne(db, "SELECT COUNT(*) as count FROM logs WHERE category = 'death' AND action = 'Death'")) as Record<string,number>).count,
          totalMessages: ((await getOne(db, "SELECT COUNT(*) as count FROM logs WHERE category = 'chat'")) as Record<string,number>).count,
          avgPlaytime: Math.round(((await getOne(db, "SELECT AVG(total_playtime) as avg FROM players WHERE total_playtime > 0")) as Record<string,number>)?.avg || 0),
          avgSessionCount: Math.round((((await getOne(db, "SELECT AVG(session_count) as avg FROM players")) as Record<string,number>)?.avg || 0) * 10) / 10,
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
            activePlayers: ((await getOne(db, `SELECT COUNT(DISTINCT player_uuid) as count FROM sessions WHERE join_time BETWEEN ? AND ? ${sWhere}`, [dayStart, dayEnd, ...sf.params])) as Record<string,number>).count,
            newPlayers: ((await getOne(db, "SELECT COUNT(*) as count FROM players WHERE first_seen BETWEEN ? AND ?", [dayStart, dayEnd])) as Record<string,number>).count,
          });
        }
        return NextResponse.json(result);
      }

      case "stats/platforms": {
        const sid = q.get("server_id");
        if (sid && sid !== "all") {
          return NextResponse.json(await getAll(db, `SELECT p.platform, COUNT(DISTINCT p.uuid) as count FROM players p INNER JOIN sessions s ON s.player_uuid = p.uuid WHERE s.server_id = ? GROUP BY p.platform ORDER BY count DESC`, [sid]));
        }
        return NextResponse.json(await getAll(db, "SELECT platform, COUNT(*) as count FROM players GROUP BY platform ORDER BY count DESC"));
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
        const results = [];
        for (const b of brackets) {
          const row = b.max === Infinity
            ? await getOne(db, "SELECT COUNT(*) as count FROM players WHERE ? - last_seen >= ?", [now, b.min])
            : await getOne(db, "SELECT COUNT(*) as count FROM players WHERE ? - last_seen >= ? AND ? - last_seen < ?", [now, b.min, now, b.max]);
          results.push({ label: b.label, count: (row as Record<string,number>).count });
        }
        return NextResponse.json(results);
      }

      case "stats/commands": {
        const sid = q.get("server_id");
        const limit = Number(q.get("limit")) || 20;
        const sf = serverFilter(sid);
        const where = sf.where ? `WHERE category = 'command' AND ${sf.where}` : "WHERE category = 'command'";
        return NextResponse.json(await getAll(db, `SELECT action as command, COUNT(*) as count FROM logs ${where} GROUP BY action ORDER BY count DESC LIMIT ?`, [...sf.params, limit]));
      }

      case "stats/peak-hours": {
        const sid = q.get("server_id");
        const sf = serverFilter(sid);
        const where = sf.where ? `WHERE ${sf.where}` : "";
        return NextResponse.json(await getAll(db, `SELECT (join_time / 3600000 % 24) as hour, COUNT(*) as count FROM sessions ${where} GROUP BY hour ORDER BY hour`, sf.params));
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
          const joined = ((await getOne(db, "SELECT COUNT(*) as count FROM players WHERE first_seen BETWEEN ? AND ?", [dayStart, dayEnd])) as Record<string,number>).count;
          const returnedNextDay = ((await getOne(db, `SELECT COUNT(DISTINCT p.uuid) as count FROM players p INNER JOIN sessions s ON s.player_uuid = p.uuid WHERE p.first_seen BETWEEN ? AND ? AND s.join_time > ? AND s.join_time < ? ${sJoin}`, [dayStart, dayEnd, dayEnd, dayEnd + day, ...sf.params])) as Record<string,number>).count;
          const returnedWeek = ((await getOne(db, `SELECT COUNT(DISTINCT p.uuid) as count FROM players p INNER JOIN sessions s ON s.player_uuid = p.uuid WHERE p.first_seen BETWEEN ? AND ? AND s.join_time > ? AND s.join_time < ? ${sJoin}`, [dayStart, dayEnd, dayEnd, dayEnd + 7 * day, ...sf.params])) as Record<string,number>).count;
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
        return NextResponse.json(await getAll(db, `SELECT world_name, COUNT(DISTINCT player_uuid) as unique_players, COUNT(*) as total_visits, SUM(duration) as total_time FROM world_visits ${where} GROUP BY world_name ORDER BY unique_players DESC`, sf.params));
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
          const players = await getAll(db, query, params);
          let cq = `SELECT COUNT(DISTINCT p.uuid) as count FROM players p INNER JOIN sessions s ON s.player_uuid = p.uuid WHERE s.server_id = ?`;
          const cp: unknown[] = [sid];
          if (search) { cq += " AND p.username LIKE ?"; cp.push(`%${search}%`); }
          const total = ((await getOne(db, cq, cp)) as Record<string,number>).count;
          return NextResponse.json({ players, total });
        }

        let query = "SELECT * FROM players";
        const params: unknown[] = [];
        if (search) { query += " WHERE username LIKE ?"; params.push(`%${search}%`); }
        query += ` ORDER BY ${sortCol} ${order} LIMIT ? OFFSET ?`;
        params.push(limit, offset);
        const players = await getAll(db, query, params);
        const cp = search ? [`%${search}%`] : [];
        const total = ((await getOne(db, `SELECT COUNT(*) as count FROM players ${search ? "WHERE username LIKE ?" : ""}`, cp)) as Record<string,number>).count;
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
        const total = ((await getOne(db, `SELECT COUNT(*) as count FROM logs ${wc}`, params)) as Record<string,number>).count;
        const logs = await getAll(db, `SELECT * FROM logs ${wc} ORDER BY timestamp DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
        return NextResponse.json({ logs, total });
      }

      case "logs/categories": {
        const sid = q.get("server_id");
        const sf = serverFilter(sid);
        const where = sf.where ? `WHERE ${sf.where}` : "";
        return NextResponse.json(await getAll(db, `SELECT category, COUNT(*) as count FROM logs ${where} GROUP BY category ORDER BY count DESC`, sf.params));
      }

      case "logs/stats": {
        const sid = q.get("server_id");
        const now = Date.now(), day = 86400000;
        const sf = serverFilter(sid);
        const w = sf.where ? `WHERE ${sf.where}` : "";
        const wAnd = sf.where ? `WHERE ${sf.where} AND` : "WHERE";
        return NextResponse.json({
          totalLogs: ((await getOne(db, `SELECT COUNT(*) as count FROM logs ${w}`, sf.params)) as Record<string,number>).count,
          logsLast24h: ((await getOne(db, `SELECT COUNT(*) as count FROM logs ${wAnd} timestamp > ?`, [...sf.params, now - day])) as Record<string,number>).count,
          warnings: ((await getOne(db, `SELECT COUNT(*) as count FROM logs ${wAnd} level = 'warning'`, sf.params)) as Record<string,number>).count,
          warningsLast24h: ((await getOne(db, `SELECT COUNT(*) as count FROM logs ${wAnd} level = 'warning' AND timestamp > ?`, [...sf.params, now - day])) as Record<string,number>).count,
          topPlayers: await getAll(db, `SELECT player_name, COUNT(*) as count FROM logs ${wAnd} player_name IS NOT NULL GROUP BY player_name ORDER BY count DESC LIMIT 10`, sf.params),
          topItems: await getAll(db, `SELECT item_name, COUNT(*) as count FROM logs ${wAnd} item_name IS NOT NULL AND item_name != '' GROUP BY item_name ORDER BY count DESC LIMIT 10`, sf.params),
          topActions: await getAll(db, `SELECT action, COUNT(*) as count FROM logs ${w} GROUP BY action ORDER BY count DESC LIMIT 10`, sf.params),
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
          totalBets: ((await getOne(db, `SELECT COUNT(*) as count FROM casino_transactions ${w}`, sf.params)) as Record<string, number>).count,
          totalBetAmount: ((await getOne(db, `SELECT COALESCE(SUM(bet_amount), 0) as total FROM casino_transactions ${w}`, sf.params)) as Record<string, number>).total,
          totalWinAmount: ((await getOne(db, `SELECT COALESCE(SUM(win_amount), 0) as total FROM casino_transactions ${w}`, sf.params)) as Record<string, number>).total,
          totalNetResult: ((await getOne(db, `SELECT COALESCE(SUM(net_result), 0) as total FROM casino_transactions ${w}`, sf.params)) as Record<string, number>).total,
          uniquePlayers: ((await getOne(db, `SELECT COUNT(DISTINCT player_uuid) as count FROM casino_transactions ${w}`, sf.params)) as Record<string, number>).count,
          betsLast24h: ((await getOne(db, `SELECT COUNT(*) as count FROM casino_transactions ${wAnd} timestamp > ?`, [...sf.params, now - day])) as Record<string, number>).count,
          betsLast7d: ((await getOne(db, `SELECT COUNT(*) as count FROM casino_transactions ${wAnd} timestamp > ?`, [...sf.params, now - week])) as Record<string, number>).count,
          winsCount: ((await getOne(db, `SELECT COUNT(*) as count FROM casino_transactions ${wAnd} net_result > 0`, sf.params)) as Record<string, number>).count,
          lossesCount: ((await getOne(db, `SELECT COUNT(*) as count FROM casino_transactions ${wAnd} net_result < 0`, sf.params)) as Record<string, number>).count,
          avgBet: Math.round(((await getOne(db, `SELECT COALESCE(AVG(bet_amount), 0) as avg FROM casino_transactions ${w}`, sf.params)) as Record<string, number>).avg),
        });
      }

      case "stats/casino/games": {
        const sid = q.get("server_id");
        const sf = serverFilter(sid);
        const w = sf.where ? `WHERE ${sf.where}` : "";
        return NextResponse.json(await getAll(db,
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
          const row = (await getOne(db,
            `SELECT COUNT(*) as bets, COALESCE(SUM(bet_amount), 0) as bet_total, COALESCE(SUM(win_amount), 0) as win_total, COALESCE(SUM(net_result), 0) as net FROM casino_transactions WHERE timestamp BETWEEN ? AND ? ${sWhere}`,
            [dayStart, dayEnd, ...sf.params])) as Record<string, number>;
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
        return NextResponse.json(await getAll(db,
          `SELECT c.player_uuid, p.username, COUNT(*) as total_bets, SUM(c.bet_amount) as total_bet, SUM(c.win_amount) as total_won, SUM(c.net_result) as net FROM casino_transactions c LEFT JOIN players p ON p.uuid = c.player_uuid WHERE 1=1 ${sJoin} GROUP BY c.player_uuid ORDER BY total_bets DESC LIMIT ?`,
          [...sf.params, limit]));
      }

      // ==================== ECONOMY ====================
      case "stats/economy": {
        const sid = q.get("server_id");
        const sf = serverFilter(sid);
        const w = sf.where ? `WHERE ${sf.where}` : "";
        const wCat = sf.where ? `WHERE category = 'economy' AND ${sf.where}` : "WHERE category = 'economy'";
        const now = Date.now(), day = 86400000, week = 7 * day;

        // Total money from player configs is not available here, estimate from logs
        const shopBuys = (await getOne(db, `SELECT COUNT(*) as count, COALESCE(SUM(CAST(SUBSTR(detail, INSTR(detail, 'for ') + 4, CASE WHEN INSTR(SUBSTR(detail, INSTR(detail, 'for ') + 4), ' ') > 0 THEN INSTR(SUBSTR(detail, INSTR(detail, 'for ') + 4), ' ') - 1 ELSE LENGTH(SUBSTR(detail, INSTR(detail, 'for ') + 4)) END) AS INTEGER)), 0) as volume FROM logs ${wCat} AND action = 'ShopBuy'`, sf.params)) as Record<string, number> | null;
        const shopSells = (await getOne(db, `SELECT COUNT(*) as count, COALESCE(SUM(CAST(SUBSTR(detail, INSTR(detail, 'for ') + 4, CASE WHEN INSTR(SUBSTR(detail, INSTR(detail, 'for ') + 4), ' ') > 0 THEN INSTR(SUBSTR(detail, INSTR(detail, 'for ') + 4), ' ') - 1 ELSE LENGTH(SUBSTR(detail, INSTR(detail, 'for ') + 4)) END) AS INTEGER)), 0) as volume FROM logs ${wCat} AND action IN ('ShopSell', 'SellAll')`, sf.params)) as Record<string, number> | null;
        const marketBuys = (await getOne(db, `SELECT COUNT(*) as count FROM logs ${wCat} AND action = 'MarketBuy'`, sf.params)) as Record<string, number>;
        const marketSells = (await getOne(db, `SELECT COUNT(*) as count FROM logs ${wCat} AND action = 'MarketSell'`, sf.params)) as Record<string, number>;
        const pays = (await getOne(db, `SELECT COUNT(*) as count FROM logs ${wCat} AND action = 'Pay'`, sf.params)) as Record<string, number>;
        const txLast24h = (await getOne(db, `SELECT COUNT(*) as count FROM logs ${wCat} AND timestamp > ?`, [...sf.params, now - day])) as Record<string, number>;
        const txLast7d = (await getOne(db, `SELECT COUNT(*) as count FROM logs ${wCat} AND timestamp > ?`, [...sf.params, now - week])) as Record<string, number>;

        return NextResponse.json({
          shopBuyCount: shopBuys?.count || 0,
          shopBuyVolume: shopBuys?.volume || 0,
          shopSellCount: shopSells?.count || 0,
          shopSellVolume: shopSells?.volume || 0,
          marketBuyCount: marketBuys.count,
          marketSellCount: marketSells.count,
          payCount: pays.count,
          txLast24h: txLast24h.count,
          txLast7d: txLast7d.count,
        });
      }

      case "stats/economy/top-items": {
        const sid = q.get("server_id");
        const sf = serverFilter(sid);
        const wCat = sf.where ? `WHERE category = 'economy' AND ${sf.where}` : "WHERE category = 'economy'";
        return NextResponse.json(await getAll(db,
          `SELECT item_name, action, COUNT(*) as tx_count, SUM(item_count) as total_qty FROM logs ${wCat} AND item_name IS NOT NULL AND item_name != '' GROUP BY item_name, action ORDER BY tx_count DESC LIMIT 30`,
          sf.params));
      }

      case "stats/economy/daily": {
        const days = Number(q.get("days")) || 30;
        const sid = q.get("server_id");
        const now = Date.now(), day = 86400000;
        const sf = serverFilter(sid);
        const sWhere = sf.where ? `AND ${sf.where}` : "";
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
          const dayStart = now - (i + 1) * day, dayEnd = now - i * day;
          const buys = (await getOne(db, `SELECT COUNT(*) as count FROM logs WHERE category = 'economy' AND action = 'ShopBuy' AND timestamp BETWEEN ? AND ? ${sWhere}`, [dayStart, dayEnd, ...sf.params])) as Record<string, number>;
          const sells = (await getOne(db, `SELECT COUNT(*) as count FROM logs WHERE category = 'economy' AND action IN ('ShopSell', 'SellAll') AND timestamp BETWEEN ? AND ? ${sWhere}`, [dayStart, dayEnd, ...sf.params])) as Record<string, number>;
          const market = (await getOne(db, `SELECT COUNT(*) as count FROM logs WHERE category = 'economy' AND action IN ('MarketBuy', 'MarketSell') AND timestamp BETWEEN ? AND ? ${sWhere}`, [dayStart, dayEnd, ...sf.params])) as Record<string, number>;
          result.push({
            date: new Date(dayStart).toISOString().split("T")[0],
            shopBuys: buys.count,
            shopSells: sells.count,
            marketTx: market.count,
          });
        }
        return NextResponse.json(result);
      }

      case "stats/economy/top-spenders": {
        const sid = q.get("server_id");
        const limit = Number(q.get("limit")) || 10;
        const sf = serverFilter(sid);
        const wCat = sf.where ? `WHERE category = 'economy' AND ${sf.where}` : "WHERE category = 'economy'";
        return NextResponse.json(await getAll(db,
          `SELECT player_name, COUNT(*) as tx_count, SUM(CASE WHEN action = 'ShopBuy' THEN 1 ELSE 0 END) as buys, SUM(CASE WHEN action IN ('ShopSell','SellAll') THEN 1 ELSE 0 END) as sells, SUM(CASE WHEN action = 'Pay' THEN 1 ELSE 0 END) as pays FROM logs ${wCat} AND player_name IS NOT NULL GROUP BY player_name ORDER BY tx_count DESC LIMIT ?`,
          [...sf.params, limit]));
      }

      // ==================== ECONOMY CIRCULATION ====================
      case "stats/economy/circulation": {
        const sid = q.get("server_id");
        const sf = serverFilter(sid);
        const w = sf.where ? `WHERE ${sf.where}` : "";
        // Latest snapshot
        const latest = await getOne(db, `SELECT * FROM economy_snapshots ${w} ORDER BY timestamp DESC LIMIT 1`, sf.params);
        // History (last 30 snapshots)
        const history = await getAll(db, `SELECT total_money, player_count, avg_money, timestamp FROM economy_snapshots ${w} ORDER BY timestamp DESC LIMIT 30`, sf.params);
        return NextResponse.json({ latest, history: history.reverse() });
      }

      // ==================== ITEMS CIRCULATION ====================
      case "stats/items/circulation": {
        const sid = q.get("server_id");
        const search = q.get("search");
        const limit = Number(q.get("limit")) || 50;
        const sf = serverFilter(sid);
        const wCat = sf.where ? `WHERE category = 'economy' AND ${sf.where}` : "WHERE category = 'economy'";

        // Aggregate items: buys add items to players, sells remove items from players
        // Also include crafts and box openings
        const items = await getAll(db, `
          SELECT
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
          LIMIT ?
        `, [...sf.params, ...(search ? [`%${search}%`] : []), limit]);

        // Summary stats
        const totalUniqueItems = (await getOne(db, `SELECT COUNT(DISTINCT item_name) as count FROM logs ${sf.where ? `WHERE ${sf.where} AND` : "WHERE"} item_name IS NOT NULL AND item_name != '' AND category IN ('economy', 'craft', 'box')`, sf.params)) as Record<string, number>;
        const totalTx = (await getOne(db, `SELECT COUNT(*) as count FROM logs ${sf.where ? `WHERE ${sf.where} AND` : "WHERE"} item_name IS NOT NULL AND item_name != '' AND category IN ('economy', 'craft', 'box')`, sf.params)) as Record<string, number>;

        return NextResponse.json({
          items,
          totalUniqueItems: totalUniqueItems.count,
          totalTransactions: totalTx.count,
        });
      }

      case "stats/items/daily": {
        const days = Number(q.get("days")) || 14;
        const itemName = q.get("item");
        const sid = q.get("server_id");
        const now = Date.now(), day = 86400000;
        const sf = serverFilter(sid);
        const sWhere = sf.where ? `AND ${sf.where}` : "";
        const itemFilter = itemName ? "AND item_name = ?" : "";
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
          const dayStart = now - (i + 1) * day, dayEnd = now - i * day;
          const params = [dayStart, dayEnd, ...sf.params, ...(itemName ? [itemName] : [])];
          const row = (await getOne(db, `SELECT
            SUM(CASE WHEN action IN ('ShopBuy', 'MarketBuy') THEN COALESCE(item_count, 1) ELSE 0 END) as bought,
            SUM(CASE WHEN action IN ('ShopSell', 'SellAll', 'MarketSell') THEN COALESCE(item_count, 1) ELSE 0 END) as sold,
            SUM(CASE WHEN action = 'Craft' THEN COALESCE(item_count, 1) ELSE 0 END) as crafted
          FROM logs WHERE timestamp BETWEEN ? AND ? ${sWhere} AND item_name IS NOT NULL AND category IN ('economy', 'craft', 'box') ${itemFilter}`, params)) as Record<string, number>;
          result.push({
            date: new Date(dayStart).toISOString().split("T")[0],
            bought: row?.bought || 0,
            sold: row?.sold || 0,
            crafted: row?.crafted || 0,
          });
        }
        return NextResponse.json(result);
      }

      // ==================== BOXES ====================
      case "stats/boxes": {
        const sid = q.get("server_id");
        const sf = serverFilter(sid);
        const wCat = sf.where ? `WHERE category = 'box' AND ${sf.where}` : "WHERE category = 'box'";
        const wCatAnd = sf.where ? `WHERE category = 'box' AND ${sf.where} AND` : "WHERE category = 'box' AND";
        const now = Date.now(), day = 86400000, week = 7 * day;

        return NextResponse.json({
          totalOpened: ((await getOne(db, `SELECT COUNT(*) as count FROM logs ${wCat}`, sf.params)) as Record<string, number>).count,
          openedLast24h: ((await getOne(db, `SELECT COUNT(*) as count FROM logs ${wCatAnd} timestamp > ?`, [...sf.params, now - day])) as Record<string, number>).count,
          openedLast7d: ((await getOne(db, `SELECT COUNT(*) as count FROM logs ${wCatAnd} timestamp > ?`, [...sf.params, now - week])) as Record<string, number>).count,
          uniquePlayers: ((await getOne(db, `SELECT COUNT(DISTINCT player_uuid) as count FROM logs ${wCat}`, sf.params)) as Record<string, number>).count,
          topBoxTypes: await getAll(db, `SELECT action as box_type, COUNT(*) as open_count, COUNT(DISTINCT player_uuid) as unique_players FROM logs ${wCat} GROUP BY action ORDER BY open_count DESC LIMIT 20`, sf.params),
          topRewards: await getAll(db, `SELECT item_name, SUM(COALESCE(item_count, 1)) as total_qty, COUNT(*) as times_obtained FROM logs ${wCatAnd} item_name IS NOT NULL AND item_name != '' GROUP BY item_name ORDER BY times_obtained DESC LIMIT 20`, sf.params),
          topOpeners: await getAll(db, `SELECT player_name, COUNT(*) as open_count FROM logs ${wCatAnd} player_name IS NOT NULL GROUP BY player_name ORDER BY open_count DESC LIMIT 10`, sf.params),
        });
      }

      case "stats/boxes/daily": {
        const days = Number(q.get("days")) || 30;
        const sid = q.get("server_id");
        const now = Date.now(), day = 86400000;
        const sf = serverFilter(sid);
        const sWhere = sf.where ? `AND ${sf.where}` : "";
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
          const dayStart = now - (i + 1) * day, dayEnd = now - i * day;
          const row = (await getOne(db, `SELECT COUNT(*) as opens, COUNT(DISTINCT player_uuid) as players FROM logs WHERE category = 'box' AND timestamp BETWEEN ? AND ? ${sWhere}`, [dayStart, dayEnd, ...sf.params])) as Record<string, number>;
          result.push({
            date: new Date(dayStart).toISOString().split("T")[0],
            opens: row?.opens || 0,
            players: row?.players || 0,
          });
        }
        return NextResponse.json(result);
      }

      case "servers": {
        return NextResponse.json(await getAll(db, "SELECT * FROM servers ORDER BY server_name"));
      }

      default: {
        // Handle players/:uuid
        if (path[0] === "players" && path.length === 2) {
          const uuid = path[1];
          const sid = q.get("server_id");
          const player = await getOne(db, "SELECT * FROM players WHERE uuid = ?", [uuid]);
          if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
          const sf = serverFilter(sid);
          const sWhere = sf.where ? `AND ${sf.where}` : "";
          return NextResponse.json({
            player,
            sessions: await getAll(db, `SELECT * FROM sessions WHERE player_uuid = ? ${sWhere} ORDER BY join_time DESC LIMIT 50`, [uuid, ...sf.params]),
            commands: await getAll(db, `SELECT action as command, detail as arguments, world, timestamp, server_id FROM logs WHERE player_uuid = ? AND category = 'command' ${sWhere} ORDER BY timestamp DESC LIMIT 100`, [uuid, ...sf.params]),
            worlds: await getAll(db, `SELECT * FROM world_visits WHERE player_uuid = ? ${sWhere} ORDER BY enter_time DESC LIMIT 100`, [uuid, ...sf.params]),
            deaths: await getAll(db, `SELECT detail as cause, world, x, y, z, timestamp, server_id FROM logs WHERE player_uuid = ? AND category = 'death' AND action = 'Death' ${sWhere} ORDER BY timestamp DESC LIMIT 50`, [uuid, ...sf.params]),
            messages: await getAll(db, `SELECT detail as message, world, timestamp, server_id FROM logs WHERE player_uuid = ? AND category = 'chat' ${sWhere} ORDER BY timestamp DESC LIMIT 100`, [uuid, ...sf.params]),
            commandStats: await getAll(db, `SELECT action as command, COUNT(*) as count FROM logs WHERE player_uuid = ? AND category = 'command' ${sWhere} GROUP BY action ORDER BY count DESC LIMIT 20`, [uuid, ...sf.params]),
            worldStats: await getAll(db, `SELECT world_name, SUM(duration) as total_time, COUNT(*) as visits FROM world_visits WHERE player_uuid = ? ${sWhere} GROUP BY world_name ORDER BY total_time DESC`, [uuid, ...sf.params]),
            casinoStats: await getOne(db, `SELECT COUNT(*) as total_bets, COALESCE(SUM(bet_amount),0) as total_bet, COALESCE(SUM(win_amount),0) as total_won, COALESCE(SUM(net_result),0) as net FROM casino_transactions WHERE player_uuid = ? ${sWhere}`, [uuid, ...sf.params]),
            casinoHistory: await getAll(db, `SELECT * FROM casino_transactions WHERE player_uuid = ? ${sWhere} ORDER BY timestamp DESC LIMIT 50`, [uuid, ...sf.params]),
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
