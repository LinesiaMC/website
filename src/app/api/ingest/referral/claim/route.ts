import { NextRequest, NextResponse } from "next/server";
import { claimReferral } from "@/lib/referral";

const API_KEY = process.env.ANALYTICS_API_KEY || "920a083dea9c7132b47ffe03b9f9340ae82947467ab44b733f980e2699515058";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-api-key") !== API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({})) as {
    code?: string; xuid?: string; username?: string; firstJoinAt?: number;
  };
  const code = (body.code || "").trim().toUpperCase();
  const xuid = (body.xuid || "").trim();
  const username = (body.username || "").trim();
  const firstJoinAt = Number(body.firstJoinAt) || 0;
  if (!code || !xuid || !username) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }
  const result = await claimReferral({ code, referredXuid: xuid, referredName: username, firstJoinAt });
  if (!result.ok) return NextResponse.json(result, { status: 200 });
  return NextResponse.json({
    ok: true,
    useId: result.useId,
    referrerXuid: result.referrerXuid,
    referrerName: result.referrerName,
  });
}
