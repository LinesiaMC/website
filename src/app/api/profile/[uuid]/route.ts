import { NextRequest, NextResponse } from "next/server";
import { getPlayerStats } from "@/lib/player-auth";
import { getDb, getOne } from "@/lib/analytics-db";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await ctx.params;
  const db = await getDb();

  let stats = await getPlayerStats(uuid);

  // Fallback: id matches a player_accounts row (unlinked user visiting their own public page).
  if (!stats) {
    const acc = await getOne(db,
      `SELECT id, microsoft_gamertag, microsoft_display_name, display_name, created_at, last_login, linked_player_uuid
       FROM player_accounts WHERE id = ? LIMIT 1`,
      [uuid]);
    if (acc) {
      if (acc.linked_player_uuid) {
        stats = await getPlayerStats(acc.linked_player_uuid as string);
      }
      if (!stats) {
        const name = (acc.microsoft_gamertag as string) || (acc.display_name as string) || (acc.microsoft_display_name as string) || "Anonyme";
        const firstSeen = (acc.created_at as number) || Date.now();
        const lastSeen = (acc.last_login as number) || firstSeen;
        stats = {
          uuid: acc.id as string,
          xuid: null,
          username: name,
          platform: "—",
          firstSeen,
          lastSeen,
          totalPlaytime: 0,
          sessionCount: 0,
          money: null,
          casinoNet: null,
          deaths: 0,
          extra: null,
          cosmetics: [],
        };
      }
    }
  }

  if (!stats) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const acc = await getOne(db,
    `SELECT microsoft_gamertag, microsoft_display_name, created_at
     FROM player_accounts
     WHERE linked_player_uuid = ? OR linked_player_uuid = ?
     LIMIT 1`,
    [stats.uuid, stats.xuid || ""]);

  const link = acc ? {
    microsoftGamertag: (acc.microsoft_gamertag as string) || null,
    microsoftDisplayName: (acc.microsoft_display_name as string) || null,
    linkedSince: (acc.created_at as number) || null,
  } : null;

  return NextResponse.json({ stats, link });
}
