import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { buildMicrosoftAuthUrl } from "@/lib/microsoft-auth";

const STATE_COOKIE = "linesia_player_oauth_state";
const RETURN_COOKIE = "linesia_player_oauth_return";

export async function GET(req: NextRequest) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Microsoft OAuth not configured" }, { status: 500 });
  }
  const redirectUri = process.env.MICROSOFT_PLAYER_REDIRECT_URI
    || new URL("/api/account/microsoft/callback", (process.env.SITE_URL || req.nextUrl.origin)).toString();
  const state = randomBytes(16).toString("hex");
  const returnTo = req.nextUrl.searchParams.get("return") || "/fr/account";

  const url = buildMicrosoftAuthUrl({ clientId, redirectUri, state });
  const res = NextResponse.redirect(url);
  const opts = { httpOnly: true, secure: req.nextUrl.protocol === "https:", sameSite: "lax" as const, path: "/", maxAge: 600 };
  res.cookies.set(STATE_COOKIE, state, opts);
  res.cookies.set(RETURN_COOKIE, returnTo, opts);
  return res;
}
