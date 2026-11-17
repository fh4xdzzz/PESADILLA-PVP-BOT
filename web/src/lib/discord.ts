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

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export interface DiscordToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export function discordAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("DISCORD_CLIENT_ID"),
    redirect_uri: appBaseUrl() + "/api/auth/discord/callback",
    response_type: "code",
    scope: "identify guilds",
    state,
  });
  return "https://discord.com/oauth2/authorize?" + params.toString();
}

async function requestToken(body: URLSearchParams): Promise<DiscordToken> {
  const res = await fetch(DISCORD_API + "/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!res.ok) throw new Error("discord_token_exchange_failed:" + res.status);
  const data = await res.json() as Partial<DiscordToken>;
  if (!data.access_token || !data.refresh_token || !data.expires_in) {
    throw new Error("discord_token_response_incomplete");
  }
  return data as DiscordToken;
}

export async function exchangeDiscordCode(code: string): Promise<DiscordToken> {
  return requestToken(new URLSearchParams({
    client_id: requireEnv("DISCORD_CLIENT_ID"),
    client_secret: requireEnv("DISCORD_CLIENT_SECRET"),
    grant_type: "authorization_code",
    code,
    redirect_uri: appBaseUrl() + "/api/auth/discord/callback",
  }));
}

export async function refreshDiscordToken(refreshToken: string): Promise<DiscordToken> {
  return requestToken(new URLSearchParams({
    client_id: requireEnv("DISCORD_CLIENT_ID"),
    client_secret: requireEnv("DISCORD_CLIENT_SECRET"),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  }));
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const res = await fetch(DISCORD_API + "/users/@me", {
    headers: { Authorization: "Bearer " + accessToken },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("discord_user_fetch_failed:" + res.status);
  const data = await res.json() as DiscordUser;
  if (!data.id || !data.username) throw new Error("discord_user_invalid");
  return data;
}

export async function fetchDiscordGuilds(accessToken: string): Promise<DiscordGuild[]> {
  const res = await fetch(DISCORD_API + "/users/@me/guilds", {
    headers: { Authorization: "Bearer " + accessToken },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("discord_guilds_failed:" + res.status);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error("discord_guilds_invalid");
  return data.filter((guild): guild is DiscordGuild => (
    typeof guild === "object" && guild !== null &&
    typeof guild.id === "string" && typeof guild.name === "string" &&
    typeof guild.permissions === "string"
  ));
}

export function discordAvatarUrl(user: DiscordUser, size = 128): string | null {
  if (!user.avatar) return null;
  return "https://cdn.discordapp.com/avatars/" + user.id + "/" + user.avatar + ".png?size=" + size;
}

export function isDiscordReady(): boolean {
  return Boolean(optionalEnv("DISCORD_CLIENT_ID") && optionalEnv("DISCORD_CLIENT_SECRET"));
}
