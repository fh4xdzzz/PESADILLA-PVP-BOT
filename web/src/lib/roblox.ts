import { appBaseUrl, optionalEnv, requireEnv } from "./env";
import { codeChallengeS256 } from "./pkce";

const ROBLOX_API = "https://apis.roblox.com/oauth";

export interface RobloxUserInfo {
  sub: string;
  name?: string;
  nickname?: string;
  preferred_username?: string;
  created_at?: number;
  profile?: string;
  picture?: string | null;
}

export interface RobloxTokens {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  id_token?: string;
}

export function isRobloxConfigured(): boolean {
  return Boolean(optionalEnv("ROBLOX_CLIENT_ID") && optionalEnv("ROBLOX_CLIENT_SECRET"));
}

export function robloxRedirectUri(): string {
  return `${appBaseUrl()}/api/auth/roblox/callback`;
}

export function robloxAuthorizeUrl(params: {
  state: string;
  codeChallenge: string;
}): string {
  const query = new URLSearchParams({
    client_id: requireEnv("ROBLOX_CLIENT_ID"),
    redirect_uri: robloxRedirectUri(),
    scope: "openid profile",
    response_type: "code",
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: "S256",
  });
  return `${ROBLOX_API}/v1/authorize?${query.toString()}`;
}

export function pkceChallengeFor(verifier: string): string {
  return codeChallengeS256(verifier);
}

export async function exchangeRobloxCode(code: string, codeVerifier: string): Promise<RobloxTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: robloxRedirectUri(),
    client_id: requireEnv("ROBLOX_CLIENT_ID"),
    client_secret: requireEnv("ROBLOX_CLIENT_SECRET"),
    code_verifier: codeVerifier,
  });
  const res = await fetch(`${ROBLOX_API}/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`roblox_token_exchange_failed:${res.status}`);
  const data = (await res.json()) as RobloxTokens;
  if (!data.access_token) throw new Error("roblox_token_missing");
  return data;
}

export async function fetchRobloxUserInfo(accessToken: string): Promise<RobloxUserInfo> {
  const res = await fetch(`${ROBLOX_API}/v1/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`roblox_userinfo_failed:${res.status}`);
  const data = (await res.json()) as RobloxUserInfo;
  if (!data.sub) throw new Error("roblox_userinfo_missing_sub");
  return data;
}

export function robloxProfileUrl(user: RobloxUserInfo): string {
  if (user.profile) return user.profile;
  return `https://www.roblox.com/users/${user.sub}/profile`;
}
