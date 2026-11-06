import { appBaseUrl, optionalEnv, requireEnv } from "./env";

const DISCORD_API = "https://discord.com/api/v10";

export interface DiscordUser {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
  discriminator?: string;
  locale?: string;
}

export function discordAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("DISCORD_CLIENT_ID"),
    redirect_uri: `${appBaseUrl()}/api/auth/discord/callback`,
    response_type: "code",
    scope: "identify",
    state,
  });
  return `${DISCORD_API.replace("/api/v10", "")}/oauth2/authorize?${params.toString()}`;
}

export async function exchangeDiscordCode(code: string): Promise<string> {
  const body = new URLSearchParams({
    client_id: requireEnv("DISCORD_CLIENT_ID"),
    client_secret: requireEnv("DISCORD_CLIENT_SECRET"),
    grant_type: "authorization_code",
    code,
    redirect_uri: `${appBaseUrl()}/api/auth/discord/callback`,
  });
  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`discord_token_exchange_failed:${res.status}`);
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("discord_token_missing");
  return data.access_token;
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`discord_user_fetch_failed:${res.status}`);
  const data = (await res.json()) as DiscordUser;
  if (!data.id || !data.username) throw new Error("discord_user_invalid");
  return data;
}

export function discordAvatarUrl(user: DiscordUser, size = 128): string | null {
  if (!user.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${size}`;
}

export function isDiscordReady(): boolean {
  return Boolean(optionalEnv("DISCORD_CLIENT_ID") && optionalEnv("DISCORD_CLIENT_SECRET"));
}
