import { NextRequest, NextResponse } from "next/server";
import { getDb, run, getOne, upsertServer } from "@/lib/analytics-db";

const API_KEY = process.env.ANALYTICS_API_KEY || "920a083dea9c7132b47ffe03b9f9340ae82947467ab44b733f980e2699515058";

function checkApiKey(req: NextRequest): boolean {
  return req.headers.get("x-api-key") === API_KEY;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  if (!checkApiKey(req)) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const { path } = await params;
  const route = path.join("/");
  const body = await req.json();
  const db = await getDb();

  try {
    switch (route) {
      case "join": {
        const { uuid, username, platform, timestamp, ip, server_id, server_name } = body;
        const now = timestamp || Date.now();
        upsertServer(db, server_id, server_name);
        run(db, `INSERT INTO players (uuid, username, platform, first_seen, last_seen, session_count, ip_address)
          VALUES (?, ?, ?, ?, ?, 1, ?)
          ON CONFLICT(uuid) DO UPDATE SET username=excluded.username, platform=excluded.platform,
          last_seen=excluded.last_seen, session_count=session_count+1, ip_address=excluded.ip_address`,
          [uuid, username, platform || "Unknown", now, now, ip || null]);
        run(db, `INSERT INTO sessions (player_uuid, join_time, platform, server_id) VALUES (?, ?, ?, ?)`,
          [uuid, now, platform || "Unknown", server_id || null]);
        return NextResponse.json({ success: true });
      }

      case "leave": {
        const { uuid, timestamp, playtime, server_id, server_name } = body;
        const now = timestamp || Date.now();
        upsertServer(db, server_id, server_name);
        let sq = `SELECT id FROM sessions WHERE player_uuid = ? AND leave_time IS NULL`;
        const sp: unknown[] = [uuid];
        if (server_id) { sq += ` AND server_id = ?`; sp.push(server_id); }
        sq += ` ORDER BY join_time DESC LIMIT 1`;
        const session = getOne(db, sq, sp);
        if (session) run(db, `UPDATE sessions SET leave_time = ?, duration = ? WHERE id = ?`, [now, playtime || 0, session.id]);
        run(db, `UPDATE players SET last_seen = ?, total_playtime = total_playtime + ? WHERE uuid = ?`, [now, playtime || 0, uuid]);
        let wq = `UPDATE world_visits SET leave_time = ?, duration = ? - enter_time WHERE player_uuid = ? AND leave_time IS NULL`;
        const wp: unknown[] = [now, now, uuid];
        if (server_id) { wq += ` AND server_id = ?`; wp.push(server_id); }
        run(db, wq, wp);
        return NextResponse.json({ success: true });
      }

      case "command": {
        const { uuid, command, arguments: args, world, timestamp, server_id, server_name } = body;
        upsertServer(db, server_id, server_name);
        run(db, `INSERT INTO commands (player_uuid, command, arguments, world, timestamp, server_id) VALUES (?,?,?,?,?,?)`,
          [uuid, command, args || "", world || "", timestamp || Date.now(), server_id || null]);
        return NextResponse.json({ success: true });
      }

      case "world": {
        const { uuid, world, timestamp, server_id, server_name } = body;
        const now = timestamp || Date.now();
        upsertServer(db, server_id, server_name);
        let cq = `UPDATE world_visits SET leave_time = ?, duration = ? - enter_time WHERE player_uuid = ? AND leave_time IS NULL`;
        const cp: unknown[] = [now, now, uuid];
        if (server_id) { cq += ` AND server_id = ?`; cp.push(server_id); }
        run(db, cq, cp);
        run(db, `INSERT INTO world_visits (player_uuid, world_name, enter_time, server_id) VALUES (?,?,?,?)`,
          [uuid, world, now, server_id || null]);
        return NextResponse.json({ success: true });
      }

      case "chat": {
        const { uuid, message, world, timestamp, server_id, server_name } = body;
        upsertServer(db, server_id, server_name);
        run(db, `INSERT INTO chat_messages (player_uuid, message, world, timestamp, server_id) VALUES (?,?,?,?,?)`,
          [uuid, message, world || "", timestamp || Date.now(), server_id || null]);
        return NextResponse.json({ success: true });
      }

      case "death": {
        const { uuid, cause, world, x, y, z, timestamp, server_id, server_name } = body;
        upsertServer(db, server_id, server_name);
        run(db, `INSERT INTO deaths (player_uuid, cause, world, x, y, z, timestamp, server_id) VALUES (?,?,?,?,?,?,?,?)`,
          [uuid, cause || "Unknown", world || "", x || 0, y || 0, z || 0, timestamp || Date.now(), server_id || null]);
        return NextResponse.json({ success: true });
      }

      case "casino": {
        const { uuid, game, bet_amount, win_amount, currency, timestamp, server_id, server_name } = body;
        upsertServer(db, server_id, server_name);
        const net = (win_amount || 0) - (bet_amount || 0);
        run(db, `INSERT INTO casino_transactions (player_uuid, game, bet_amount, win_amount, net_result, currency, timestamp, server_id) VALUES (?,?,?,?,?,?,?,?)`,
          [uuid, game || "unknown", bet_amount || 0, win_amount || 0, net, currency || "gems", timestamp || Date.now(), server_id || null]);
        return NextResponse.json({ success: true });
      }

      case "block": {
        const { uuid, action, block_id, world, x, y, z, timestamp, server_id, server_name } = body;
        upsertServer(db, server_id, server_name);
        run(db, `INSERT INTO block_events (player_uuid, action, block_id, world, x, y, z, timestamp, server_id) VALUES (?,?,?,?,?,?,?,?,?)`,
          [uuid, action, block_id, world || "", x || 0, y || 0, z || 0, timestamp || Date.now(), server_id || null]);
        return NextResponse.json({ success: true });
      }

      case "batch": {
        const { events, server_id, server_name } = body;
        if (!Array.isArray(events)) return NextResponse.json({ error: "events must be an array" }, { status: 400 });
        upsertServer(db, server_id, server_name);
        const sid = server_id || null;
        for (const e of events) {
          switch (e.type) {
            case "command":
              run(db, `INSERT INTO commands (player_uuid, command, arguments, world, timestamp, server_id) VALUES (?,?,?,?,?,?)`,
                [e.uuid, e.command, e.arguments || "", e.world || "", e.timestamp || Date.now(), sid]);
              break;
            case "chat":
              run(db, `INSERT INTO chat_messages (player_uuid, message, world, timestamp, server_id) VALUES (?,?,?,?,?)`,
                [e.uuid, e.message, e.world || "", e.timestamp || Date.now(), sid]);
              break;
            case "death":
              run(db, `INSERT INTO deaths (player_uuid, cause, world, x, y, z, timestamp, server_id) VALUES (?,?,?,?,?,?,?,?)`,
                [e.uuid, e.cause || "Unknown", e.world || "", e.x || 0, e.y || 0, e.z || 0, e.timestamp || Date.now(), sid]);
              break;
            case "block":
              run(db, `INSERT INTO block_events (player_uuid, action, block_id, world, x, y, z, timestamp, server_id) VALUES (?,?,?,?,?,?,?,?,?)`,
                [e.uuid, e.action, e.block_id, e.world || "", e.x || 0, e.y || 0, e.z || 0, e.timestamp || Date.now(), sid]);
              break;
            case "casino": {
              const net = (e.win_amount || 0) - (e.bet_amount || 0);
              run(db, `INSERT INTO casino_transactions (player_uuid, game, bet_amount, win_amount, net_result, currency, timestamp, server_id) VALUES (?,?,?,?,?,?,?,?)`,
                [e.uuid, e.game || "unknown", e.bet_amount || 0, e.win_amount || 0, net, e.currency || "gems", e.timestamp || Date.now(), sid]);
              break;
            }
          }
        }
        return NextResponse.json({ success: true, count: events.length });
      }

      case "log": {
        const { uuid, player, category, action, detail, item_name, item_count, item_uid, target_player, world, x, y, z, level, timestamp, server_id, server_name, bet_amount, payout, bet_type } = body;
        upsertServer(db, server_id, server_name);
        run(db, `INSERT INTO logs (player_uuid,player_name,category,action,detail,item_name,item_count,item_uid,target_player,world,x,y,z,level,timestamp,server_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [uuid || null, player || null, category, action, detail || null, item_name || null, item_count || null, item_uid || null, target_player || null, world || null, x || null, y || null, z || null, level || "info", timestamp || Date.now(), server_id || null]);
        // Also insert into casino_transactions if this is a casino log
        if (category === "casino" && uuid && bet_amount != null) {
          const winAmt = payout || 0;
          const betAmt = bet_amount || 0;
          const net = winAmt - betAmt;
          run(db, `INSERT INTO casino_transactions (player_uuid, game, bet_amount, win_amount, net_result, currency, timestamp, server_id) VALUES (?,?,?,?,?,?,?,?)`,
            [uuid, action || "unknown", betAmt, winAmt, net, bet_type || "money", timestamp || Date.now(), server_id || null]);
        }
        return NextResponse.json({ success: true });
      }

      case "logs": {
        const { logs: entries, server_id, server_name } = body;
        if (!Array.isArray(entries)) return NextResponse.json({ error: "logs must be an array" }, { status: 400 });
        upsertServer(db, server_id, server_name);
        for (const e of entries) {
          run(db, `INSERT INTO logs (player_uuid,player_name,category,action,detail,item_name,item_count,item_uid,target_player,world,x,y,z,level,timestamp,server_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [e.uuid || null, e.player || null, e.category, e.action, e.detail || null, e.item_name || null, e.item_count || null, e.item_uid || null, e.target_player || null, e.world || null, e.x || null, e.y || null, e.z || null, e.level || "info", e.timestamp || Date.now(), server_id || null]);
          // Also insert into casino_transactions if this is a casino log
          if (e.category === "casino" && e.uuid && e.bet_amount != null) {
            const winAmt = e.payout || 0;
            const betAmt = e.bet_amount || 0;
            const net = winAmt - betAmt;
            run(db, `INSERT INTO casino_transactions (player_uuid, game, bet_amount, win_amount, net_result, currency, timestamp, server_id) VALUES (?,?,?,?,?,?,?,?)`,
              [e.uuid, e.action || "unknown", betAmt, winAmt, net, e.bet_type || "money", e.timestamp || Date.now(), server_id || null]);
          }
        }
        return NextResponse.json({ success: true, count: entries.length });
      }

      default:
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Ingest error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
