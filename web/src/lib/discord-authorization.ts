import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { fetchDiscordGuilds, refreshDiscordToken, type DiscordGuild, type DiscordToken } from "./discord";
import { requireEnv } from "./env";
import { getAdminSupabase } from "./supabase";

/** Purpose-separated key derived from the session secret. Rotating SESSION_SECRET invalidates OAuth tokens too. */
function encryptionKey(): Buffer {
  return createHash("sha256").update("pesadilla/oauth/aes-gcm/v1:").update(requireEnv("SESSION_SECRET")).digest();
}
function seal(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}
function unseal(value: string): string {
  const parts = value.split(".");
  if (parts.length !== 3) throw new Error("invalid_encrypted_token");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(parts[0], "base64url"));
  decipher.setAuthTag(Buffer.from(parts[1], "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(parts[2], "base64url")), decipher.final()]).toString("utf8");
}

export async function saveDiscordAuthorization(userId: string, token: DiscordToken): Promise<boolean> {
  const db = getAdminSupabase();
  if (!db) return false;
  const expires = new Date(Date.now() + token.expires_in * 1000).toISOString();
  const { error } = await db.from("discord_oauth_tokens").upsert({
    discord_user_id: userId,
    access_token_ciphertext: seal(token.access_token),
    refresh_token_ciphertext: seal(token.refresh_token),
    expires_at: expires,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error("discord_authorization_save_failed:" + error.code);
  return true;
}

async function loadAuthorization(userId: string): Promise<{
  accessToken: string; refreshToken: string; expiresAt: number;
} | null> {
  const db = getAdminSupabase();
  if (!db) throw new Error("server_configuration_unavailable");
  const { data, error } = await db.from("discord_oauth_tokens")
    .select("access_token_ciphertext,refresh_token_ciphertext,expires_at")
    .eq("discord_user_id", userId).maybeSingle();
  if (error) throw new Error("discord_authorization_read_failed:" + error.code);
  if (!data) return null;
  return {
    accessToken: unseal(data.access_token_ciphertext),
    refreshToken: unseal(data.refresh_token_ciphertext),
    expiresAt: Date.parse(data.expires_at),
  };
}

export async function getManageableGuilds(userId: string): Promise<DiscordGuild[]> {
  const stored = await loadAuthorization(userId);
  if (!stored) throw new Error("discord_reauthorization_required");
  let accessToken = stored.accessToken;
  const renew = async () => {
    const token = await refreshDiscordToken(stored.refreshToken);
    await saveDiscordAuthorization(userId, token);
    return token.access_token;
  };
  if (!Number.isFinite(stored.expiresAt) || stored.expiresAt < Date.now() + 60_000) {
    accessToken = await renew();
  }
  let guilds: DiscordGuild[];
  try {
    guilds = await fetchDiscordGuilds(accessToken);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.endsWith(":401")) throw error;
    accessToken = await renew();
    guilds = await fetchDiscordGuilds(accessToken);
  }
  // ADMINISTRATOR = 0x8; MANAGE_GUILD = 0x20. Never trust guild IDs submitted by the client.
  return guilds.filter((guild) => {
    try {
      const permissions = BigInt(guild.permissions);
      return guild.owner === true || (permissions & BigInt(8)) !== 0n || (permissions & BigInt(32)) !== 0n;
    } catch {
      return false;
    }
  }).map((guild) => ({
    id: guild.id, name: guild.name, icon: guild.icon, owner: guild.owner, permissions: guild.permissions,
  }));
}
