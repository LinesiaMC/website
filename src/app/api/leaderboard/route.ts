import { NextRequest, NextResponse } from "next/server";
import { getDb, getAll, getOne } from "@/lib/analytics-db";

// Scalar sorts target real columns. Stat sorts go through json_extract on
// player_profile_extra.stats_json — cheap enough at current player count.
const SCALAR_SORTS: Record<string, string> = {
  total_playtime:  "p.total_playtime",
  session_count:   "p.session_count",
  last_seen:       "p.last_seen",
  first_seen:      "p.first_seen",
  kills:           "COALESCE(ppe.kills, 0)",
  deaths:          "COALESCE(ppe.deaths, 0)",
  killstreak:      "COALESCE(ppe.killstreak, 0)",
  prestige:        "COALESCE(ppe.prestige, 0)",
  money:           "COALESCE(ppe.money, 0)",
  power:           "COALESCE(ppe.power, 0)",
  prime:           "COALESCE(ppe.prime, 0)",
  kd_ratio:        "CAST(COALESCE(ppe.kills, 0) AS REAL) / NULLIF(COALESCE(ppe.deaths, 0), 0)",
  in_playtime:     "COALESCE(ppe.playtime, 0)",
};

const STAT_SORTS = new Set([
  "mine", "place", "walk", "message", "fish", "fishstreak", "damage_dealt",
  "critical_hit", "bow_use", "pearl", "gapple", "healing_heart",
  "coal_ore", "emerald_ore", "amethyste_ore", "rubis_ore",
  "zombie", "pigman", "wither",
  "wheat", "beetroot", "potatoes", "carrots", "pumpkin", "melon", "nether_wart",
  "repair", "enchant", "vote_streak", "shop_gain", "recycler_nugget",
]);

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const sort = q.get("sort") || "total_playtime";
  const limit = Math.min(Number(q.get("limit")) || 50, 200);
  const offset = Math.max(Number(q.get("offset")) || 0, 0);
  const search = (q.get("search") || "").trim();

  let orderExpr = SCALAR_SORTS.total_playtime;
  if (sort in SCALAR_SORTS) orderExpr = SCALAR_SORTS[sort];
  else if (STAT_SORTS.has(sort)) orderExpr = `CAST(json_extract(ppe.stats_json, '$.${sort}') AS INTEGER)`;

  const db = await getDb();
  const where = search ? "WHERE p.username LIKE ?" : "";
  const params: unknown[] = search ? [`%${search}%`] : [];
  const rows = await getAll(db,
    `SELECT p.uuid, p.username, p.platform, p.total_playtime, p.session_count, p.last_seen, p.first_seen,
            pa.id AS account_id, pa.microsoft_gamertag AS linked_ms_gamertag,
            ppe.rank, ppe.prestige, ppe.money, ppe.power, ppe.prime,
            ppe.kills, ppe.deaths, ppe.killstreak, ppe.playtime AS in_playtime,
            ppe.faction_json, ppe.stats_json
     FROM players p
     LEFT JOIN player_accounts pa
       ON pa.linked_player_uuid = p.uuid OR pa.linked_player_uuid = p.xuid
     LEFT JOIN player_profile_extra ppe ON ppe.xuid = p.xuid
     ${where} ORDER BY ${orderExpr} DESC NULLS LAST LIMIT ? OFFSET ?`,
    [...params, limit, offset]);
  const total = ((await getOne(db,
    `SELECT COUNT(*) as c FROM players p ${where}`, params)) as Record<string, number>).c;

  const isStatSort = STAT_SORTS.has(sort);

  const players = (rows as Record<string, unknown>[]).map((r) => {
    let factionName: string | null = null;
    if (r.faction_json) {
      try { factionName = (JSON.parse(r.faction_json as string) as { name?: string }).name ?? null; } catch {}
    }
    let statValue: number | null = null;
    if (isStatSort && r.stats_json) {
      try {
        const raw = JSON.parse(r.stats_json as string) as Record<string, unknown>;
        const v = raw[sort];
        if (typeof v === "number") statValue = v;
        else if (typeof v === "string" && v !== "") statValue = Number(v) || null;
      } catch {}
    }
    const kills = Number(r.kills) || 0;
    const deaths = Number(r.deaths) || 0;
    return {
      uuid: r.uuid,
      username: r.username,
      platform: r.platform,
      total_playtime: r.total_playtime,
      session_count: r.session_count,
      last_seen: r.last_seen,
      first_seen: r.first_seen,
      linked: !!r.account_id,
      linked_ms_gamertag: r.linked_ms_gamertag || null,
      rank: (r.rank as string) || null,
      prestige: Number(r.prestige) || 0,
      money: r.money != null ? Number(r.money) : null,
      power: Number(r.power) || 0,
      prime: r.prime != null ? Number(r.prime) : null,
      kills,
      deaths,
      killstreak: Number(r.killstreak) || 0,
      kd: deaths > 0 ? kills / deaths : kills,
      faction: factionName,
      stat_value: statValue,
    };
  });

  return NextResponse.json({ players, total, sort });
}
