import { NextRequest, NextResponse } from "next/server";
import { requirePlayer, unlinkPlayer, isPlayerAccount } from "@/lib/player-auth";

export async function POST(req: NextRequest) {
  const acc = await requirePlayer(req);
  if (!isPlayerAccount(acc)) return acc;
  await unlinkPlayer(acc.id);
  return NextResponse.json({ ok: true });
}
