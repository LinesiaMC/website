import { NextRequest, NextResponse } from "next/server";
import { markDelivered } from "@/lib/referral";

const API_KEY = process.env.ANALYTICS_API_KEY || "920a083dea9c7132b47ffe03b9f9340ae82947467ab44b733f980e2699515058";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-api-key") !== API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({})) as {
    useId?: number; side?: "referrer" | "referred";
  };
  const useId = Number(body.useId) || 0;
  const side = body.side;
  if (!useId || (side !== "referrer" && side !== "referred")) {
    return NextResponse.json({ error: "invalid_fields" }, { status: 400 });
  }
  await markDelivered(useId, side);
  return NextResponse.json({ ok: true });
}
