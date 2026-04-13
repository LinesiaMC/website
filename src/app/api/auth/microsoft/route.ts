import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { buildMicrosoftAuthUrl } from "@/lib/microsoft-auth";

const OAUTH_STATE_COOKIE = "linesia_oauth_state";
const OAUTH_RETURN_COOKIE = "linesia_oauth_return";
const OAUTH_MODE_COOKIE = "linesia_oauth_mode";

export async function GET(req: NextRequest) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Microsoft OAuth not configured (MICROSOFT_CLIENT_ID missing)" }, { status: 500 });
  }
  const redirectUri = buildRedirectUri(req);
  const state = randomBytes(16).toString("hex");
  const returnTo = req.nextUrl.searchParams.get("return") || "/fr/admin";
  const mode = req.nextUrl.searchParams.get("mode") === "link" ? "link" : "login";

  const url = buildMicrosoftAuthUrl({ clientId, redirectUri, state });

  const res = NextResponse.redirect(url);
  const opts = { httpOnly: true, secure: isSecure(req), sameSite: "lax" as const, path: "/", maxAge: 600 };
  res.cookies.set(OAUTH_STATE_COOKIE, state, opts);
  res.cookies.set(OAUTH_RETURN_COOKIE, returnTo, opts);
  res.cookies.set(OAUTH_MODE_COOKIE, mode, opts);
  return res;
}

function buildRedirectUri(req: NextRequest): string {
  const configured = process.env.MICROSOFT_REDIRECT_URI;
  if (configured) return configured;
  return new URL("/api/auth/microsoft/callback", req.nextUrl.origin).toString();
}
function isSecure(req: NextRequest): boolean {
  return req.nextUrl.protocol === "https:";
}
