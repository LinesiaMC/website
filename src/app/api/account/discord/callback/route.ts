import { NextRequest, NextResponse } from "next/server";
import {
  PLAYER_SESSION_COOKIE, createPlayerSession, getAccountByDiscordId,
  getCurrentAccount, touchLastLogin, updateAccountDiscord,
} from "@/lib/player-auth";

const STATE_COOKIE = "linesia_player_discord_state";
const RETURN_COOKIE = "linesia_player_discord_return";
const MODE_COOKIE = "linesia_player_discord_mode";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get(STATE_COOKIE)?.value;
  const returnTo = req.cookies.get(RETURN_COOKIE)?.value || "/fr/account";
  const mode = req.cookies.get(MODE_COOKIE)?.value === "link" ? "link" : "login";

  if (!code || !state || !cookieState || state !== cookieState) {
    return errorRedirect(req, "state_mismatch");
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) return errorRedirect(req, "not_configured");

  const redirectUri = process.env.DISCORD_PLAYER_REDIRECT_URI
    || new URL("/api/account/discord/callback", (process.env.SITE_URL || req.nextUrl.origin)).toString();

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      grant_type: "authorization_code", code, redirect_uri: redirectUri,
    }),
  });
  if (!tokenRes.ok) return errorRedirect(req, "discord_token_exchange_failed");
  const tokenJson = await tokenRes.json() as { access_token?: string };
  if (!tokenJson.access_token) return errorRedirect(req, "discord_no_token");

  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!userRes.ok) return errorRedirect(req, "discord_user_fetch_failed");
  const user = await userRes.json() as {
    id: string; username: string; global_name?: string; avatar?: string;
  };

  if (mode === "link") {
    const current = await getCurrentAccount(req);
    if (!current) return errorRedirect(req, "not_authenticated");
    const existing = await getAccountByDiscordId(user.id);
    if (existing && existing.id !== current.id) {
      return errorRedirect(req, "discord_already_linked");
    }
    await updateAccountDiscord(current.id, {
      discordId: user.id,
      discordUsername: user.username,
      discordAvatar: user.avatar || null,
    });
    return finish(req, returnTo, null);
  }

  // Login mode — only works if this Discord is already linked to an account
  // (primary identity is Microsoft, which is the only one that grants an XUID).
  const account = await getAccountByDiscordId(user.id);
  if (!account) return errorRedirect(req, "discord_not_linked");

  // Keep the Discord profile fresh on every login.
  if (account.discordUsername !== user.username || account.discordAvatar !== (user.avatar || null)) {
    await updateAccountDiscord(account.id, {
      discordId: user.id,
      discordUsername: user.username,
      discordAvatar: user.avatar || null,
    });
  }
  await touchLastLogin(account.id);
  const { token, expiresAt } = await createPlayerSession(account.id);
  return finish(req, returnTo, { token, expiresAt });
}

function finish(req: NextRequest, returnTo: string, session: { token: string; expiresAt: number } | null) {
  const res = NextResponse.redirect(new URL(returnTo, (process.env.SITE_URL || req.nextUrl.origin)));
  if (session) {
    res.cookies.set(PLAYER_SESSION_COOKIE, session.token, {
      httpOnly: true, secure: req.nextUrl.protocol === "https:", sameSite: "lax",
      path: "/", expires: new Date(session.expiresAt),
    });
  }
  res.cookies.delete(STATE_COOKIE);
  res.cookies.delete(RETURN_COOKIE);
  res.cookies.delete(MODE_COOKIE);
  return res;
}

function errorRedirect(req: NextRequest, reason: string) {
  const url = new URL("/fr/account", (process.env.SITE_URL || req.nextUrl.origin));
  url.searchParams.set("auth_error", reason);
  const res = NextResponse.redirect(url);
  res.cookies.delete(STATE_COOKIE);
  res.cookies.delete(RETURN_COOKIE);
  res.cookies.delete(MODE_COOKIE);
  return res;
}
