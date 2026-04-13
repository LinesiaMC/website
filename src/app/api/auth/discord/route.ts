import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

const OAUTH_STATE_COOKIE = "linesia_oauth_state";
const OAUTH_RETURN_COOKIE = "linesia_oauth_return";
const OAUTH_MODE_COOKIE = "linesia_oauth_mode";

export async function GET(req: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Discord OAuth not configured (DISCORD_CLIENT_ID missing)" }, { status: 500 });
  }
  const redirectUri = buildRedirectUri(req);
  const state = randomBytes(16).toString("hex");
  const returnTo = req.nextUrl.searchParams.get("return") || "/fr/admin";
  const mode = req.nextUrl.searchParams.get("mode") === "link" ? "link" : "login";

  const url = new URL("https://discord.com/api/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "identify");
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url.toString());
  const cookieOpts = { httpOnly: true, secure: isSecure(req), sameSite: "lax" as const, path: "/", maxAge: 600 };
  res.cookies.set(OAUTH_STATE_COOKIE, state, cookieOpts);
  res.cookies.set(OAUTH_RETURN_COOKIE, returnTo, cookieOpts);
  res.cookies.set(OAUTH_MODE_COOKIE, mode, cookieOpts);
  return res;
}

function buildRedirectUri(req: NextRequest): string {
  const configured = process.env.DISCORD_REDIRECT_URI;
  if (configured) return configured;
  return new URL("/api/auth/discord/callback", req.nextUrl.origin).toString();
}

function isSecure(req: NextRequest): boolean {
  return req.nextUrl.protocol === "https:";
}
