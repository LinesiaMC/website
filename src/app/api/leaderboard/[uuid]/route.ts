import { NextRequest, NextResponse } from "next/server";
import { getPlayerStats } from "@/lib/player-auth";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await ctx.params;
  const stats = await getPlayerStats(uuid);
  if (!stats) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ stats });
}
