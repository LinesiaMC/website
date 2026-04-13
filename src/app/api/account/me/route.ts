import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, getPlayerStats } from "@/lib/player-auth";

export async function GET(req: NextRequest) {
  const acc = await getCurrentAccount(req);
  if (!acc) return NextResponse.json({ account: null });
  const stats = acc.linkedPlayerUuid ? await getPlayerStats(acc.linkedPlayerUuid) : null;
  return NextResponse.json({ account: acc, stats });
}
