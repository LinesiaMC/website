import { NextRequest, NextResponse } from "next/server";
import { isPlayerAccount, requirePlayer, unlinkAccountDiscord } from "@/lib/player-auth";

export async function POST(req: NextRequest) {
  const acc = await requirePlayer(req);
  if (!isPlayerAccount(acc)) return acc;
  await unlinkAccountDiscord(acc.id);
  return NextResponse.json({ ok: true });
}
