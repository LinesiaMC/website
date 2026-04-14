import { NextRequest, NextResponse } from "next/server";
import { exchangeMicrosoftCode, fetchMicrosoftProfile } from "@/lib/microsoft-auth";
import {
  PLAYER_SESSION_COOKIE, createAccount, createPlayerSession,
  getAccountByMicrosoftId, touchLastLogin, tryAutoLinkByGamertag, updateAccountMicrosoft,
} from "@/lib/player-auth";
import { SESSION_COOKIE as STAFF_SESSION_COOKIE, createSession as createStaffSession, touchLastLogin as touchStaffLastLogin } from "@/lib/auth";
import { getDb, getOne } from "@/lib/analytics-db";

const STATE_COOKIE = "linesia_player_oauth_state";
const RETURN_COOKIE = "linesia_player_oauth_return";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get(STATE_COOKIE)?.value;
  const returnTo = req.cookies.get(RETURN_COOKIE)?.value || "/fr/account";

  if (!code || !state || !cookieState || state !== cookieState) {
    return errorRedirect(req, "state_mismatch");
  }
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return errorRedirect(req, "not_configured");
  const redirectUri = process.env.MICROSOFT_PLAYER_REDIRECT_URI
    || new URL("/api/account/microsoft/callback", (process.env.SITE_URL || req.nextUrl.origin)).toString();

  let profile;
  try {
    const msAccess = await exchangeMicrosoftCode({ code, clientId, clientSecret, redirectUri });
    profile = await fetchMicrosoftProfile(msAccess);
  } catch (e) {
    console.error("[player-ms-auth]", e);
    const msg = e instanceof Error ? e.message : String(e);
    const m = msg.match(/^xsts:\d+:([a-z_]+):/);
    if (m && m[1] !== "unknown") return errorRedirect(req, m[1]);
    const mt = msg.match(/^ms_token_exchange:(\d+):([^:]+):(.*)$/);
    if (mt) return errorRedirect(req, "ms_token_exchange_failed", `${mt[2]} — ${mt[3].slice(0, 200)}`);
    if (msg.startsWith("ms_token_exchange")) return errorRedirect(req, "ms_token_exchange_failed");
    return errorRedirect(req, "xbox_auth_failed", msg.slice(0, 200));
  }
  if (!profile.xuid) return errorRedirect(req, "no_xuid");

  let account = await getAccountByMicrosoftId(profile.xuid);
  if (!account) {
    account = await createAccount({
      microsoftId: profile.xuid,
      microsoftGamertag: profile.gamertag,
      microsoftDisplayName: profile.displayName,
      displayName: profile.displayName || profile.gamertag,
    });
    await tryAutoLinkByGamertag(account.id, profile.gamertag);
  } else if (account.microsoftGamertag !== profile.gamertag || account.microsoftDisplayName !== profile.displayName) {
    await updateAccountMicrosoft(account.id, profile.gamertag, profile.displayName);
    if (!account.linkedPlayerUuid) {
      await tryAutoLinkByGamertag(account.id, profile.gamertag);
    }
  }
  await touchLastLogin(account.id);
  const { token, expiresAt } = await createPlayerSession(account.id);

  // If this Microsoft identity (or its linked xuid) matches a staff row,
  // issue a staff session cookie too — staff access follows from the in-game
  // rank sync, no separate staff login required.
  const db = await getDb();
  const xuid = account.linkedPlayerUuid;
  let staffRow: Record<string, unknown> | null = await getOne(db,
    "SELECT id FROM staff_users WHERE microsoft_id = ? ORDER BY source = 'manual' DESC LIMIT 1",
    [profile.xuid]);
  if (!staffRow && xuid) {
    staffRow = await getOne(db,
      "SELECT id FROM staff_users WHERE linked_xuid = ? ORDER BY source = 'manual' DESC LIMIT 1",
      [xuid]);
  }

  const res = NextResponse.redirect(new URL(returnTo, (process.env.SITE_URL || req.nextUrl.origin)));
  res.cookies.set(PLAYER_SESSION_COOKIE, token, {
    httpOnly: true, secure: req.nextUrl.protocol === "https:", sameSite: "lax",
    path: "/", expires: new Date(expiresAt),
  });
  if (staffRow) {
    const staffId = staffRow.id as string;
    await touchStaffLastLogin(staffId);
    const { token: sToken, expiresAt: sExp } = await createStaffSession(staffId);
    res.cookies.set(STAFF_SESSION_COOKIE, sToken, {
      httpOnly: true, secure: req.nextUrl.protocol === "https:", sameSite: "lax",
      path: "/", expires: new Date(sExp),
    });
  }
  res.cookies.delete(STATE_COOKIE);
  res.cookies.delete(RETURN_COOKIE);
  return res;
}

function errorRedirect(req: NextRequest, reason: string, detail?: string) {
  const url = new URL("/fr/account", (process.env.SITE_URL || req.nextUrl.origin));
  url.searchParams.set("auth_error", reason);
  if (detail) url.searchParams.set("auth_error_detail", detail);
  const res = NextResponse.redirect(url);
  res.cookies.delete(STATE_COOKIE);
  res.cookies.delete(RETURN_COOKIE);
  return res;
}
