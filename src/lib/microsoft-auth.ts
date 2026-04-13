/**
 * Microsoft / Xbox Live OAuth helper.
 *
 * Flow (needed to get an Xbox Live gamertag, i.e. the Bedrock in-game name):
 *  1. Microsoft OAuth2 → access_token (scope: XboxLive.signin offline_access)
 *  2. Xbox Live user auth (user.auth.xboxlive.com) → XBL token + user hash
 *  3. XSTS authorize (xsts.auth.xboxlive.com) → XSTS token + user hash
 *  4. Xbox Live profile API → XUID + Gamertag + GameDisplayName
 */

export interface MicrosoftProfile {
  xuid: string;
  gamertag: string;
  displayName: string;
}

export async function exchangeMicrosoftCode(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<string> {
  const res = await fetch("https://login.microsoftonline.com/consumers/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: params.clientId,
      client_secret: params.clientSecret,
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
      scope: "XboxLive.signin offline_access",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ms_token_exchange:${res.status}:${body.slice(0, 300)}`);
  }
  const j = await res.json() as { access_token?: string };
  if (!j.access_token) throw new Error("ms_no_access_token");
  return j.access_token;
}

const XSTS_ERROR_MAP: Record<string, string> = {
  "2148916227": "xbox_banned",
  "2148916233": "xbox_no_account",
  "2148916235": "xbox_country_banned",
  "2148916236": "xbox_adult_verification_required",
  "2148916237": "xbox_adult_verification_required",
  "2148916238": "xbox_child_account",
  "2148916239": "xbox_account_creation_required",
};

async function xblUserAuth(msAccessToken: string): Promise<{ token: string; uhs: string }> {
  const res = await fetch("https://user.auth.xboxlive.com/user/authenticate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "x-xbl-contract-version": "1" },
    body: JSON.stringify({
      Properties: {
        AuthMethod: "RPS",
        SiteName: "user.auth.xboxlive.com",
        RpsTicket: `d=${msAccessToken}`,
      },
      RelyingParty: "http://auth.xboxlive.com",
      TokenType: "JWT",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`xbl_auth:${res.status}:${body.slice(0, 300)}`);
  }
  const j = await res.json() as { Token: string; DisplayClaims: { xui: { uhs: string }[] } };
  const uhs = j.DisplayClaims?.xui?.[0]?.uhs;
  if (!j.Token || !uhs) throw new Error("xbl_auth_no_claims");
  return { token: j.Token, uhs };
}

async function xstsAuthorize(xblToken: string): Promise<{ token: string; uhs: string; xuid: string | null }> {
  const res = await fetch("https://xsts.auth.xboxlive.com/xsts/authorize", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "x-xbl-contract-version": "1" },
    body: JSON.stringify({
      Properties: { SandboxId: "RETAIL", UserTokens: [xblToken] },
      RelyingParty: "http://xboxlive.com",
      TokenType: "JWT",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let xerr: string | null = null;
    try {
      const j = JSON.parse(body) as { XErr?: number };
      if (j.XErr != null) xerr = String(j.XErr);
    } catch {}
    const mapped = xerr ? XSTS_ERROR_MAP[xerr] : null;
    throw new Error(`xsts:${res.status}:${mapped || xerr || "unknown"}:${body.slice(0, 300)}`);
  }
  const j = await res.json() as { Token: string; DisplayClaims: { xui: { uhs: string; xid?: string }[] } };
  const claim = j.DisplayClaims?.xui?.[0];
  if (!j.Token || !claim) throw new Error("xsts_no_claims");
  return { token: j.Token, uhs: claim.uhs, xuid: claim.xid || null };
}

async function fetchXboxProfile(xstsToken: string, uhs: string, xuidHint: string | null): Promise<MicrosoftProfile> {
  const res = await fetch(
    "https://profile.xboxlive.com/users/me/profile/settings?settings=Gamertag,GameDisplayName,ModernGamertag",
    {
      headers: {
        Authorization: `XBL3.0 x=${uhs};${xstsToken}`,
        "x-xbl-contract-version": "3",
        Accept: "application/json",
      },
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`xbox_profile:${res.status}:${body.slice(0, 300)}`);
  }
  const j = await res.json() as {
    profileUsers: { id: string; settings: { id: string; value: string }[] }[];
  };
  const user = j.profileUsers?.[0];
  if (!user) throw new Error("xbox_profile_empty");
  const get = (key: string) => user.settings.find((s) => s.id === key)?.value || "";
  return {
    xuid: user.id || xuidHint || "",
    gamertag: get("ModernGamertag") || get("Gamertag"),
    displayName: get("GameDisplayName") || get("Gamertag"),
  };
}

export async function fetchMicrosoftProfile(msAccessToken: string): Promise<MicrosoftProfile> {
  const { token: xblToken } = await xblUserAuth(msAccessToken);
  const xsts = await xstsAuthorize(xblToken);
  return fetchXboxProfile(xsts.token, xsts.uhs, xsts.xuid);
}

export function buildMicrosoftAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL("https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", "XboxLive.signin offline_access");
  url.searchParams.set("state", params.state);
  return url.toString();
}
