import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE, createSession, createStaff, countStaff,
  getStaffByMicrosoftId, touchLastLogin, updateStaff, getCurrentStaff,
} from "@/lib/auth";
import { exchangeMicrosoftCode, fetchMicrosoftProfile } from "@/lib/microsoft-auth";

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

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return errorRedirect(req, "not_configured", mode);

  const redirectUri = process.env.MICROSOFT_REDIRECT_URI
    || new URL("/api/auth/microsoft/callback", (process.env.SITE_URL || req.nextUrl.origin)).toString();

  let profile;
  try {
    const msAccess = await exchangeMicrosoftCode({ code, clientId, clientSecret, redirectUri });
    profile = await fetchMicrosoftProfile(msAccess);
  } catch (e) {
    console.error("[ms-auth]", e);
    return errorRedirect(req, "xbox_auth_failed", mode);
  }
  if (!profile.xuid) return errorRedirect(req, "no_xuid", mode);

  if (mode === "link") {
    const current = await getCurrentStaff(req);
    if (!current) return errorRedirect(req, "not_authenticated", mode);
    const already = await getStaffByMicrosoftId(profile.xuid);
    if (already && already.id !== current.id) {
      return errorRedirect(req, "already_linked", mode);
    }
    await updateStaff(current.id, {
      microsoftId: profile.xuid,
      microsoftGamertag: profile.gamertag,
      microsoftDisplayName: profile.displayName,
    });
    return finish(req, returnTo, null);
  }

  let staff = await getStaffByMicrosoftId(profile.xuid);
  if (!staff) {
    const founderXuid = process.env.FOUNDER_MICROSOFT_XUID;
    const isBootstrapFounder = (await countStaff()) === 0 || profile.xuid === founderXuid;
    if (!isBootstrapFounder) return errorRedirect(req, "not_authorized", mode);
    staff = await createStaff({
      microsoftId: profile.xuid,
      microsoftGamertag: profile.gamertag,
      microsoftDisplayName: profile.displayName,
      displayName: profile.displayName || profile.gamertag,
      role: "founder",
    });
  } else if (staff.microsoftGamertag !== profile.gamertag || staff.microsoftDisplayName !== profile.displayName) {
    await updateStaff(staff.id, {
      microsoftGamertag: profile.gamertag,
      microsoftDisplayName: profile.displayName,
    });
  }
  await touchLastLogin(staff.id);
  const { token, expiresAt } = await createSession(staff.id);
  return finish(req, returnTo, { token, expiresAt });
}

function finish(req: NextRequest, returnTo: string, session: { token: string; expiresAt: number } | null) {
  const res = NextResponse.redirect(new URL(returnTo, (process.env.SITE_URL || req.nextUrl.origin)));
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
  const url = new URL(base, (process.env.SITE_URL || req.nextUrl.origin));
  url.searchParams.set("auth_error", reason);
  const res = NextResponse.redirect(url);
  res.cookies.delete(OAUTH_STATE_COOKIE);
  res.cookies.delete(OAUTH_RETURN_COOKIE);
  res.cookies.delete(OAUTH_MODE_COOKIE);
  return res;
}
