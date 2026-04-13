import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCurrentAccount } from "@/lib/player-auth";

const STATE_COOKIE = "linesia_player_discord_state";
const RETURN_COOKIE = "linesia_player_discord_return";
const MODE_COOKIE = "linesia_player_discord_mode";

export async function GET(req: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Discord OAuth not configured (DISCORD_CLIENT_ID missing)" }, { status: 500 });
  }
  const redirectUri = process.env.DISCORD_PLAYER_REDIRECT_URI
    || new URL("/api/account/discord/callback", (process.env.SITE_URL || req.nextUrl.origin)).toString();

  // Auto-detect mode: link if a player session already exists, else login.
  const current = await getCurrentAccount(req);
  const mode = current ? "link" : "login";

  const state = randomBytes(16).toString("hex");
  const returnTo = req.nextUrl.searchParams.get("return") || "/fr/account";

  const url = new URL("https://discord.com/api/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "identify");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "none");

  const res = NextResponse.redirect(url.toString());
  const opts = { httpOnly: true, secure: req.nextUrl.protocol === "https:", sameSite: "lax" as const, path: "/", maxAge: 600 };
  res.cookies.set(STATE_COOKIE, state, opts);
  res.cookies.set(RETURN_COOKIE, returnTo, opts);
  res.cookies.set(MODE_COOKIE, mode, opts);
  return res;
}
