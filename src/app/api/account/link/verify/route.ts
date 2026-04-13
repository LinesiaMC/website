import { NextRequest, NextResponse } from "next/server";
import { getAccountByLinkCode, confirmLink } from "@/lib/player-auth";

const API_KEY = process.env.ANALYTICS_API_KEY || "920a083dea9c7132b47ffe03b9f9340ae82947467ab44b733f980e2699515058";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-api-key") !== API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({})) as { code?: string; uuid?: string; username?: string };
  const code = (body.code || "").trim().toUpperCase();
  const uuid = (body.uuid || "").trim();
  const username = (body.username || "").trim();
  if (!code || !uuid || !username) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const acc = await getAccountByLinkCode(code);
  if (!acc) return NextResponse.json({ error: "invalid_or_expired" }, { status: 404 });
  await confirmLink(acc.id, uuid, username);
  return NextResponse.json({ ok: true, accountId: acc.id });
}
