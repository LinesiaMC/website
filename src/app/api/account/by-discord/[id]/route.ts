import { NextRequest, NextResponse } from "next/server";
import { getAccountByDiscordId, getPlayerStats } from "@/lib/player-auth";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const account = await getAccountByDiscordId(id);
  if (!account) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const stats = account.linkedPlayerUuid ? await getPlayerStats(account.linkedPlayerUuid) : null;

  return NextResponse.json({
    account: {
      id: account.id,
      microsoftGamertag: account.microsoftGamertag,
      discordUsername: account.discordUsername,
      linkedPlayerUuid: account.linkedPlayerUuid,
      linkedPlayerName: account.linkedPlayerName,
      displayName: account.displayName,
    },
    stats,
  });
}
