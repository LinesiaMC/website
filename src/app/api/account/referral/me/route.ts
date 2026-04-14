import { NextRequest, NextResponse } from "next/server";
import { requirePlayer, isPlayerAccount } from "@/lib/player-auth";
import { getOrCreateReferralCode, getReferralUses } from "@/lib/referral";

export async function GET(req: NextRequest) {
  const acc = await requirePlayer(req);
  if (!isPlayerAccount(acc)) return acc;
  const rc = await getOrCreateReferralCode(acc);
  const uses = await getReferralUses(acc.id);
  return NextResponse.json({
    code: rc.code,
    usesCount: rc.usesCount,
    uses,
    shareUrl: `https://linesia.net/parrainage?code=${rc.code}`,
  });
}
