import { NextRequest, NextResponse } from "next/server";
import { getDb, run, getOne, upsertServer } from "@/lib/analytics-db";
import type { Client } from "@libsql/client";
import { cacheInvalidate } from "@/lib/query-cache";
import { syncStaffFromIngame } from "@/lib/staff-sync";

// Map an in-game staff pseudo → linked staff_users row (for cross-source
// dashboard aggregation). Resolution walks: pseudo → xuid (player_profile_extra)
// → staff_users.linked_xuid or .microsoft_id → discord_id.
async function resolveStaffIdentity(db: Client, pseudo: string | null): Promise<{ staff_id: string; staff_name: string }> {
  const fallback = { staff_id: pseudo || "console", staff_name: pseudo || "Console" };
  if (!pseudo) return fallback;
  const row = await getOne(
    db,
    `SELECT su.discord_id, su.display_name, su.discord_username, su.microsoft_gamertag
     FROM staff_users su
     JOIN player_profile_extra pe ON pe.xuid = su.linked_xuid OR pe.xuid = su.microsoft_id
     WHERE pe.username = ? LIMIT 1`,
    [pseudo],
  );
  if (!row) return fallback;
  const discordId = row.discord_id as string | null;
  const name = (row.display_name || row.discord_username || row.microsoft_gamertag || pseudo) as string;
  return { staff_id: discordId || pseudo, staff_name: name };
}

// Insert a sanction (dedup) AND mirror into staff_actions so the staff
// analytics dashboard aggregates in-game sanctions alongside Discord actions.
async function recordSanction(db: Client, s: {
  player_uuid: string; player_name?: string | null; xuid?: string | null;
  type: string; reason?: string | null; staff?: string | null;
  duration?: string | null; timestamp?: number | null; server_id?: string | null;
}): Promise<void> {
  const ts = s.timestamp || Date.now();
  const existing = await getOne(db, `SELECT id FROM sanctions WHERE player_uuid = ? AND type = ? AND timestamp = ?`, [s.player_uuid, s.type, ts]);
  if (existing) return;
  await run(db,
    `INSERT INTO sanctions (player_uuid, player_name, xuid, type, reason, staff, duration, timestamp, server_id) VALUES (?,?,?,?,?,?,?,?,?)`,
    [s.player_uuid, s.player_name || null, s.xuid || null, s.type, s.reason || null, s.staff || null, s.duration || null, ts, s.server_id || null]);
  const { staff_id, staff_name } = await resolveStaffIdentity(db, s.staff || null);
  const detail = [s.reason, s.duration ? `duration=${s.duration}` : null].filter(Boolean).join(" | ") || null;
  await run(db,
    `INSERT INTO staff_actions (staff_id, staff_name, action, source, target, detail, timestamp) VALUES (?,?,?,?,?,?,?)`,
    [staff_id, staff_name, s.type, "minecraft", s.player_name || null, detail, ts]);
}

// Tables whose writes should punch through the analytics read cache. We
// invalidate broadly via prefixes rather than precise keys — cheap enough
// since the cache is small and TTL is already short.
const WRITE_INVALIDATE_PREFIXES = [
  "stats/", "logs", "players", "servers", "staff/",
];

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
        await upsertServer(db, server_id, server_name);
        await run(db, `INSERT INTO players (uuid, username, platform, first_seen, last_seen, session_count, ip_address)
          VALUES (?, ?, ?, ?, ?, 1, ?)
          ON CONFLICT(uuid) DO UPDATE SET username=excluded.username, platform=excluded.platform,
          last_seen=excluded.last_seen, session_count=session_count+1, ip_address=excluded.ip_address`,
          [uuid, username, platform || "Unknown", now, now, ip || null]);
        await run(db, `INSERT INTO sessions (player_uuid, join_time, platform, server_id) VALUES (?, ?, ?, ?)`,
          [uuid, now, platform || "Unknown", server_id || null]);
        return NextResponse.json({ success: true });
      }

      case "leave": {
        const { uuid, timestamp, playtime, server_id, server_name } = body;
        const now = timestamp || Date.now();
        await upsertServer(db, server_id, server_name);
        let sq = `SELECT id FROM sessions WHERE player_uuid = ? AND leave_time IS NULL`;
        const sp: unknown[] = [uuid];
        if (server_id) { sq += ` AND server_id = ?`; sp.push(server_id); }
        sq += ` ORDER BY join_time DESC LIMIT 1`;
        const session = await getOne(db, sq, sp);
        if (session) await run(db, `UPDATE sessions SET leave_time = ?, duration = ? WHERE id = ?`, [now, playtime || 0, session.id]);
        await run(db, `UPDATE players SET last_seen = ?, total_playtime = total_playtime + ? WHERE uuid = ?`, [now, playtime || 0, uuid]);
        let wq = `UPDATE world_visits SET leave_time = ?, duration = ? - enter_time WHERE player_uuid = ? AND leave_time IS NULL`;
        const wp: unknown[] = [now, now, uuid];
        if (server_id) { wq += ` AND server_id = ?`; wp.push(server_id); }
        await run(db, wq, wp);
        return NextResponse.json({ success: true });
      }

      case "command": {
        const { uuid, command, arguments: args, world, timestamp, server_id, server_name } = body;
        await upsertServer(db, server_id, server_name);
        await run(db, `INSERT INTO commands (player_uuid, command, arguments, world, timestamp, server_id) VALUES (?,?,?,?,?,?)`,
          [uuid, command, args || "", world || "", timestamp || Date.now(), server_id || null]);
        return NextResponse.json({ success: true });
      }

      case "world": {
        const { uuid, world, timestamp, server_id, server_name } = body;
        const now = timestamp || Date.now();
        await upsertServer(db, server_id, server_name);
        let cq = `UPDATE world_visits SET leave_time = ?, duration = ? - enter_time WHERE player_uuid = ? AND leave_time IS NULL`;
        const cp: unknown[] = [now, now, uuid];
        if (server_id) { cq += ` AND server_id = ?`; cp.push(server_id); }
        await run(db, cq, cp);
        await run(db, `INSERT INTO world_visits (player_uuid, world_name, enter_time, server_id) VALUES (?,?,?,?)`,
          [uuid, world, now, server_id || null]);
        return NextResponse.json({ success: true });
      }

      case "chat": {
        const { uuid, message, world, timestamp, server_id, server_name } = body;
        await upsertServer(db, server_id, server_name);
        await run(db, `INSERT INTO chat_messages (player_uuid, message, world, timestamp, server_id) VALUES (?,?,?,?,?)`,
          [uuid, message, world || "", timestamp || Date.now(), server_id || null]);
        return NextResponse.json({ success: true });
      }

      case "death": {
        const { uuid, cause, world, x, y, z, timestamp, server_id, server_name, killer_name, killer_uuid, victim_inventory, killer_inventory } = body;
        await upsertServer(db, server_id, server_name);
        // Build a structured detail for the logs table
        const deathDetail: Record<string, unknown> = { cause: cause || "Unknown" };
        if (killer_name) { deathDetail.killer = killer_name; deathDetail.killer_uuid = killer_uuid || null; }
        if (victim_inventory) deathDetail.victim_inventory = victim_inventory;
        if (killer_inventory) deathDetail.killer_inventory = killer_inventory;
        await run(db, `INSERT INTO deaths (player_uuid, cause, world, x, y, z, timestamp, server_id) VALUES (?,?,?,?,?,?,?,?)`,
          [uuid, cause || "Unknown", world || "", x || 0, y || 0, z || 0, timestamp || Date.now(), server_id || null]);
        return NextResponse.json({ success: true });
      }

      case "economy-snapshot": {
        const { total_money, player_count, avg_money, median_money, top_balances, timestamp, server_id, server_name } = body;
        await upsertServer(db, server_id, server_name);
        await run(db, `INSERT INTO economy_snapshots (total_money, player_count, avg_money, median_money, top_balances, timestamp, server_id) VALUES (?,?,?,?,?,?,?)`,
          [total_money || 0, player_count || 0, avg_money || 0, median_money || 0, top_balances ? JSON.stringify(top_balances) : null, timestamp || Date.now(), server_id || null]);
        return NextResponse.json({ success: true });
      }

      case "casino": {
        const { uuid, game, bet_amount, win_amount, currency, timestamp, server_id, server_name } = body;
        await upsertServer(db, server_id, server_name);
        const net = (win_amount || 0) - (bet_amount || 0);
        await run(db, `INSERT INTO casino_transactions (player_uuid, game, bet_amount, win_amount, net_result, currency, timestamp, server_id) VALUES (?,?,?,?,?,?,?,?)`,
          [uuid, game || "unknown", bet_amount || 0, win_amount || 0, net, currency || "gems", timestamp || Date.now(), server_id || null]);
        return NextResponse.json({ success: true });
      }

      case "block": {
        const { uuid, action, block_id, world, x, y, z, timestamp, server_id, server_name } = body;
        await upsertServer(db, server_id, server_name);
        await run(db, `INSERT INTO block_events (player_uuid, action, block_id, world, x, y, z, timestamp, server_id) VALUES (?,?,?,?,?,?,?,?,?)`,
          [uuid, action, block_id, world || "", x || 0, y || 0, z || 0, timestamp || Date.now(), server_id || null]);
        return NextResponse.json({ success: true });
      }

      case "batch": {
        const { events, server_id, server_name } = body;
        if (!Array.isArray(events)) return NextResponse.json({ error: "events must be an array" }, { status: 400 });
        await upsertServer(db, server_id, server_name);
        const sid = server_id || null;

        // Sanctions and alias syncs can't share the high-throughput batch path
        // (they need dedupe + cross-table mirroring) so process them inline first.
        let hasStaffWrite = false;
        for (const e of events) {
          if (e.type === "sanction" && e.player_uuid && e.sanction_type) {
            await recordSanction(db, {
              player_uuid: e.player_uuid, player_name: e.player_name, xuid: e.xuid,
              type: e.sanction_type, reason: e.reason, staff: e.staff,
              duration: e.duration, timestamp: e.timestamp, server_id: sid,
            });
            hasStaffWrite = true;
          } else if (e.type === "player-aliases" && e.player_uuid && Array.isArray(e.aliases)) {
            const now = Date.now();
            const aliasStmts: Array<{ sql: string; args: unknown[] }> = [
              { sql: `DELETE FROM player_aliases WHERE player_uuid = ?`, args: [e.player_uuid] },
            ];
            for (const alt of e.aliases) {
              const aliasUuid = alt.uuid || "";
              if (!aliasUuid) continue;
              aliasStmts.push({
                sql: `INSERT INTO player_aliases (player_uuid, player_name, alias_uuid, alias_name, alias_xuid, match_via, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?)
                  ON CONFLICT(player_uuid, alias_uuid) DO UPDATE SET alias_name=excluded.alias_name, match_via=excluded.match_via, updated_at=excluded.updated_at`,
                args: [e.player_uuid, e.player_name || "Unknown", aliasUuid, alt.pseudo || "Unknown", alt.xuid || null, alt.match_via || "", now],
              });
            }
            await db.batch(aliasStmts.map((s) => ({ sql: s.sql, args: s.args as never[] })));
          }
        }
        if (hasStaffWrite) cacheInvalidate(["staff/"]);

        // Build one `db.batch()` payload so N events = 1 round-trip to libsql
        // instead of N sequential awaits.
        const stmts: Array<{ sql: string; args: unknown[] }> = [];
        for (const e of events) {
          switch (e.type) {
            case "command":
              stmts.push({
                sql: `INSERT INTO commands (player_uuid, command, arguments, world, timestamp, server_id) VALUES (?,?,?,?,?,?)`,
                args: [e.uuid, e.command, e.arguments || "", e.world || "", e.timestamp || Date.now(), sid],
              });
              break;
            case "chat":
              stmts.push({
                sql: `INSERT INTO chat_messages (player_uuid, message, world, timestamp, server_id) VALUES (?,?,?,?,?)`,
                args: [e.uuid, e.message, e.world || "", e.timestamp || Date.now(), sid],
              });
              break;
            case "death":
              stmts.push({
                sql: `INSERT INTO deaths (player_uuid, cause, world, x, y, z, timestamp, server_id) VALUES (?,?,?,?,?,?,?,?)`,
                args: [e.uuid, e.cause || "Unknown", e.world || "", e.x || 0, e.y || 0, e.z || 0, e.timestamp || Date.now(), sid],
              });
              break;
            case "block":
              stmts.push({
                sql: `INSERT INTO block_events (player_uuid, action, block_id, world, x, y, z, timestamp, server_id) VALUES (?,?,?,?,?,?,?,?,?)`,
                args: [e.uuid, e.action, e.block_id, e.world || "", e.x || 0, e.y || 0, e.z || 0, e.timestamp || Date.now(), sid],
              });
              break;
            case "casino": {
              const net = (e.win_amount || 0) - (e.bet_amount || 0);
              stmts.push({
                sql: `INSERT INTO casino_transactions (player_uuid, game, bet_amount, win_amount, net_result, currency, timestamp, server_id) VALUES (?,?,?,?,?,?,?,?)`,
                args: [e.uuid, e.game || "unknown", e.bet_amount || 0, e.win_amount || 0, net, e.currency || "gems", e.timestamp || Date.now(), sid],
              });
              break;
            }
          }
        }
        if (stmts.length > 0) {
          await db.batch(stmts.map((s) => ({ sql: s.sql, args: s.args as never[] })));
          cacheInvalidate(WRITE_INVALIDATE_PREFIXES);
        }
        return NextResponse.json({ success: true, count: events.length });
      }

      case "log": {
        const { uuid, player, category, action, detail, item_name, item_count, item_uid, item_enchantments, target_player, world, x, y, z, level, timestamp, server_id, server_name, bet_amount, payout, bet_type } = body;
        await upsertServer(db, server_id, server_name);
        await run(db, `INSERT INTO logs (player_uuid,player_name,category,action,detail,item_name,item_count,item_uid,item_enchantments,target_player,world,x,y,z,level,timestamp,server_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [uuid || null, player || null, category, action, detail || null, item_name || null, item_count || null, item_uid || null, item_enchantments ? JSON.stringify(item_enchantments) : null, target_player || null, world || null, x || null, y || null, z || null, level || "info", timestamp || Date.now(), server_id || null]);
        if (category === "casino" && uuid && bet_amount != null) {
          const winAmt = payout || 0;
          const betAmt = bet_amount || 0;
          const net = winAmt - betAmt;
          await run(db, `INSERT INTO casino_transactions (player_uuid, game, bet_amount, win_amount, net_result, currency, timestamp, server_id) VALUES (?,?,?,?,?,?,?,?)`,
            [uuid, action || "unknown", betAmt, winAmt, net, bet_type || "money", timestamp || Date.now(), server_id || null]);
        }
        return NextResponse.json({ success: true });
      }

      case "staff-action": {
        const { staff_id, staff_name, action, source, target, detail, timestamp } = body;
        if (!staff_id || !staff_name || !action) {
          return NextResponse.json({ error: "staff_id, staff_name, and action are required" }, { status: 400 });
        }
        await run(db, `INSERT INTO staff_actions (staff_id, staff_name, action, source, target, detail, timestamp) VALUES (?,?,?,?,?,?,?)`,
          [staff_id, staff_name, action, source || "discord", target || null, detail || null, timestamp || Date.now()]);
        return NextResponse.json({ success: true });
      }

      case "staff-actions": {
        const { actions: staffEntries } = body;
        if (!Array.isArray(staffEntries)) return NextResponse.json({ error: "actions must be an array" }, { status: 400 });
        const stmts: Array<{ sql: string; args: unknown[] }> = [];
        for (const e of staffEntries) {
          if (!e.staff_id || !e.staff_name || !e.action) continue;
          stmts.push({
            sql: `INSERT INTO staff_actions (staff_id, staff_name, action, source, target, detail, timestamp) VALUES (?,?,?,?,?,?,?)`,
            args: [e.staff_id, e.staff_name, e.action, e.source || "minecraft", e.target || null, e.detail || null, e.timestamp || Date.now()],
          });
        }
        if (stmts.length > 0) {
          await db.batch(stmts.map((s) => ({ sql: s.sql, args: s.args as never[] })));
          cacheInvalidate(["staff/"]);
        }
        return NextResponse.json({ success: true, count: staffEntries.length });
      }

      case "sanction": {
        const { player_uuid, player_name, xuid, type, reason, staff, duration, timestamp, server_id, server_name } = body;
        if (!player_uuid || !type) {
          return NextResponse.json({ error: "player_uuid and type are required" }, { status: 400 });
        }
        await upsertServer(db, server_id, server_name);
        await recordSanction(db, { player_uuid, player_name, xuid, type, reason, staff, duration, timestamp, server_id });
        cacheInvalidate(["staff/"]);
        return NextResponse.json({ success: true });
      }

      case "player-aliases": {
        const { player_uuid, player_name, aliases, server_id, server_name } = body;
        if (!player_uuid || !Array.isArray(aliases)) {
          return NextResponse.json({ error: "player_uuid and aliases array are required" }, { status: 400 });
        }
        await upsertServer(db, server_id, server_name);
        const now = Date.now();
        // DELETE + re-inserts folded into one batch round-trip.
        const stmts: Array<{ sql: string; args: unknown[] }> = [
          { sql: `DELETE FROM player_aliases WHERE player_uuid = ?`, args: [player_uuid] },
        ];
        for (const alt of aliases) {
          const aliasUuid = alt.uuid || "";
          if (!aliasUuid) continue;
          stmts.push({
            sql: `INSERT INTO player_aliases (player_uuid, player_name, alias_uuid, alias_name, alias_xuid, match_via, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(player_uuid, alias_uuid) DO UPDATE SET alias_name=excluded.alias_name, match_via=excluded.match_via, updated_at=excluded.updated_at`,
            args: [player_uuid, player_name || "Unknown", aliasUuid, alt.pseudo || "Unknown", alt.xuid || null, alt.match_via || "", now],
          });
        }
        await db.batch(stmts.map((s) => ({ sql: s.sql, args: s.args as never[] })));
        return NextResponse.json({ success: true, count: aliases.length });
      }

      case "logs": {
        const { logs: entries, server_id, server_name } = body;
        if (!Array.isArray(entries)) return NextResponse.json({ error: "logs must be an array" }, { status: 400 });
        await upsertServer(db, server_id, server_name);
        const stmts: Array<{ sql: string; args: unknown[] }> = [];
        for (const e of entries) {
          stmts.push({
            sql: `INSERT INTO logs (player_uuid,player_name,category,action,detail,item_name,item_count,item_uid,item_enchantments,target_player,world,x,y,z,level,timestamp,server_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            args: [e.uuid || null, e.player || null, e.category, e.action, e.detail || null, e.item_name || null, e.item_count || null, e.item_uid || null, e.item_enchantments ? JSON.stringify(e.item_enchantments) : null, e.target_player || null, e.world || null, e.x || null, e.y || null, e.z || null, e.level || "info", e.timestamp || Date.now(), server_id || null],
          });
          if (e.category === "casino" && e.uuid && e.bet_amount != null) {
            const winAmt = e.payout || 0;
            const betAmt = e.bet_amount || 0;
            const net = winAmt - betAmt;
            stmts.push({
              sql: `INSERT INTO casino_transactions (player_uuid, game, bet_amount, win_amount, net_result, currency, timestamp, server_id) VALUES (?,?,?,?,?,?,?,?)`,
              args: [e.uuid, e.action || "unknown", betAmt, winAmt, net, e.bet_type || "money", e.timestamp || Date.now(), server_id || null],
            });
          }
        }
        if (stmts.length > 0) {
          await db.batch(stmts.map((s) => ({ sql: s.sql, args: s.args as never[] })));
          cacheInvalidate(WRITE_INVALIDATE_PREFIXES);
        }
        return NextResponse.json({ success: true, count: entries.length });
      }

      case "player-profile": {
        const {
          xuid, uuid, username, rank, rank_color, prestige, money, power, prime,
          kills, deaths, killstreak, playtime, join_count, first_join, last_leave,
          jobs, stats: statsSnapshot, faction, completed_quests, description,
          lang, discord_id, timestamp, server_id, server_name,
        } = body;
        if (!xuid) return NextResponse.json({ error: "xuid required" }, { status: 400 });
        await upsertServer(db, server_id, server_name);
        const now = timestamp || Date.now();
        await run(db,
          `INSERT INTO player_profile_extra (xuid, uuid, username, rank, rank_color, prestige, money, power, prime, kills, deaths, killstreak, playtime, join_count, first_join, last_leave, jobs, stats_json, faction_json, completed_quests, description, lang, discord_id, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(xuid) DO UPDATE SET
             uuid=excluded.uuid, username=excluded.username, rank=excluded.rank, rank_color=excluded.rank_color,
             prestige=excluded.prestige, money=excluded.money, power=excluded.power, prime=excluded.prime,
             kills=excluded.kills, deaths=excluded.deaths, killstreak=excluded.killstreak,
             playtime=excluded.playtime, join_count=excluded.join_count, first_join=excluded.first_join,
             last_leave=excluded.last_leave, jobs=excluded.jobs, stats_json=excluded.stats_json,
             faction_json=excluded.faction_json, completed_quests=excluded.completed_quests,
             description=excluded.description, lang=excluded.lang, discord_id=excluded.discord_id,
             updated_at=excluded.updated_at`,
          [xuid, uuid || null, username || null, rank || null, rank_color || null,
            prestige || 0, money || 0, power || 0, prime ?? null,
            kills || 0, deaths || 0, killstreak || 0, playtime || 0, join_count || 0,
            first_join || null, last_leave || null,
            jobs ? JSON.stringify(jobs) : null,
            statsSnapshot ? JSON.stringify(statsSnapshot) : null,
            faction ? JSON.stringify(faction) : null,
            completed_quests ? JSON.stringify(completed_quests) : null,
            description || null, lang || null,
            discord_id != null ? String(discord_id) : null,
            now]);
        if (uuid) {
          await run(db, `UPDATE players SET xuid = ? WHERE uuid = ? AND (xuid IS NULL OR xuid = '')`, [xuid, uuid]);
        }
        // The Minecraft server is the source of truth for staff rank.
        await syncStaffFromIngame({ xuid, uuid: uuid || null, username: username || "Unknown", ingameRank: rank || null });
        return NextResponse.json({ success: true });
      }

      case "cosmetics": {
        const { xuid, uuid, cosmetics: list, timestamp, server_id, server_name } = body;
        if (!xuid || !Array.isArray(list)) {
          return NextResponse.json({ error: "xuid and cosmetics array required" }, { status: 400 });
        }
        await upsertServer(db, server_id, server_name);
        const now = timestamp || Date.now();
        const stmts: Array<{ sql: string; args: unknown[] }> = [
          { sql: `DELETE FROM player_cosmetics WHERE xuid = ?`, args: [xuid] },
        ];
        for (const c of list) {
          if (!c?.full_id) continue;
          stmts.push({
            sql: `INSERT INTO player_cosmetics (xuid, full_id, type, identifier, name, active, updated_at)
                  VALUES (?,?,?,?,?,?,?)`,
            args: [xuid, c.full_id, c.type || "", c.id || c.identifier || "", c.name || null, c.active ? 1 : 0, now],
          });
        }
        if (uuid) {
          stmts.push({
            sql: `UPDATE players SET xuid = ? WHERE uuid = ? AND (xuid IS NULL OR xuid = '')`,
            args: [xuid, uuid],
          });
        }
        await db.batch(stmts.map((s) => ({ sql: s.sql, args: s.args as never[] })));
        return NextResponse.json({ success: true, count: list.length });
      }

      default:
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Ingest error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
