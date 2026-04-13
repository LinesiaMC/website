import { NextRequest, NextResponse } from "next/server";
import { getPlayerStats } from "@/lib/player-auth";
import { getDb, getOne } from "@/lib/analytics-db";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await ctx.params;
  const stats = await getPlayerStats(uuid);
  if (!stats) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const db = await getDb();
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
