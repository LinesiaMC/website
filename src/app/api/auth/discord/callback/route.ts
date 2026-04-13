import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE, createSession, createStaff, countStaff,
  getStaffByDiscordId, touchLastLogin, updateStaff, getCurrentStaff,
} from "@/lib/auth";

const OAUTH_STATE_COOKIE = "linesia_oauth_state";
const OAUTH_RETURN_COOKIE = "linesia_oauth_return";
const OAUTH_MODE_COOKIE = "linesia_oauth_mode";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const returnTo = req.cookies.get(OAUTH_RETURN_COOKIE)?.value || "/fr/admin";
  const mode = req.cookies.get(OAUTH_MODE_COOKIE)?.value === "link" ? "link" : "login";

  if (!code || !state || !cookieState || state !== cookieState) {
    return errorRedirect(req, "state_mismatch", mode);
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) return errorRedirect(req, "not_configured", mode);

  const redirectUri = process.env.DISCORD_REDIRECT_URI
    || new URL("/api/auth/discord/callback", req.nextUrl.origin).toString();

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      grant_type: "authorization_code", code, redirect_uri: redirectUri,
    }),
  });
  if (!tokenRes.ok) return errorRedirect(req, "token_exchange_failed", mode);
  const tokenJson = await tokenRes.json() as { access_token?: string };
  if (!tokenJson.access_token) return errorRedirect(req, "no_token", mode);

  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!userRes.ok) return errorRedirect(req, "user_fetch_failed", mode);
  const user = await userRes.json() as {
    id: string; username: string; global_name?: string; avatar?: string;
  };

  // Link mode: attach to current session's staff
  if (mode === "link") {
    const current = await getCurrentStaff(req);
    if (!current) return errorRedirect(req, "not_authenticated", mode);
    const alreadyLinked = await getStaffByDiscordId(user.id);
    if (alreadyLinked && alreadyLinked.id !== current.id) {
      return errorRedirect(req, "already_linked", mode);
    }
    await updateStaff(current.id, {
      discordId: user.id,
      discordUsername: user.username,
      discordAvatar: user.avatar || null,
    });
    return finish(req, returnTo, null);
  }

  // Login mode
  let staff = await getStaffByDiscordId(user.id);
  if (!staff) {
    const founderId = process.env.FOUNDER_DISCORD_ID;
    const isBootstrapFounder = (await countStaff()) === 0 || user.id === founderId;
    if (!isBootstrapFounder) return errorRedirect(req, "not_authorized", mode);
    staff = await createStaff({
      discordId: user.id,
      discordUsername: user.username,
      discordAvatar: user.avatar || null,
      displayName: user.global_name || user.username,
      role: "founder",
    });
  } else if (staff.discordUsername !== user.username || staff.discordAvatar !== (user.avatar || null)) {
    await updateStaff(staff.id, {
      discordUsername: user.username,
      discordAvatar: user.avatar || null,
    });
  }
  await touchLastLogin(staff.id);
  const { token, expiresAt } = await createSession(staff.id);
  return finish(req, returnTo, { token, expiresAt });
}

function finish(req: NextRequest, returnTo: string, session: { token: string; expiresAt: number } | null) {
  const res = NextResponse.redirect(new URL(returnTo, req.nextUrl.origin));
  if (session) {
    res.cookies.set(SESSION_COOKIE, session.token, {
      httpOnly: true, secure: req.nextUrl.protocol === "https:", sameSite: "lax",
      path: "/", expires: new Date(session.expiresAt),
    });
  }
  res.cookies.delete(OAUTH_STATE_COOKIE);
  res.cookies.delete(OAUTH_RETURN_COOKIE);
  res.cookies.delete(OAUTH_MODE_COOKIE);
  return res;
}

function errorRedirect(req: NextRequest, reason: string, mode: string) {
  const base = mode === "link" ? "/fr/admin/profile" : "/fr/admin";
  const url = new URL(base, req.nextUrl.origin);
  url.searchParams.set("auth_error", reason);
  const res = NextResponse.redirect(url);
  res.cookies.delete(OAUTH_STATE_COOKIE);
  res.cookies.delete(OAUTH_RETURN_COOKIE);
  res.cookies.delete(OAUTH_MODE_COOKIE);
  return res;
}
