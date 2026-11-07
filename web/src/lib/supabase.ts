import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { optionalEnv } from "./env";
import type { DiscordUser } from "./discord";
import type { RobloxUserInfo } from "./roblox";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = optionalEnv("SUPABASE_URL");
  // Prefer the service role key; fall back to a publishable key (works with the
  // RLS policies + RPC secret defined in supabase/migrations). Both stay server-only.
  const key = optionalEnv("SUPABASE_SERVICE_ROLE_KEY") ?? optionalEnv("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) return null;
  if (!client) client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

function rpcSecret(): string {
  const secret = optionalEnv("SUPABASE_RPC_SECRET");
  if (!secret) throw new Error("Missing SUPABASE_RPC_SECRET");
  return secret;
}

/** Upserts the Discord identity after a successful OAuth login. Server-only. */
export async function upsertDiscordUser(user: DiscordUser): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.rpc("upsert_discord_user", {
    p_secret: rpcSecret(),
    p_discord_user_id: user.id,
    p_username: user.username,
    p_global_name: user.global_name ?? null,
    p_avatar_hash: user.avatar ?? null,
    p_locale: user.locale ?? null,
  });
  if (error) throw new Error(`supabase_upsert_failed:${error.message}`);
}

export interface RobloxLink {
  roblox_user_id: number;
  roblox_username: string | null;
  roblox_display_name: string | null;
  roblox_avatar_url: string | null;
  status: string;
  linked_at: string;
}

export async function linkRobloxAccount(
  discordUserId: string,
  user: RobloxUserInfo
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("supabase_not_configured");
  const robloxUserId = Number(user.sub);
  if (!Number.isSafeInteger(robloxUserId) || robloxUserId <= 0) {
    throw new Error("roblox_invalid_user_id");
  }
  const { error } = await supabase.rpc("link_roblox_account", {
    p_secret: rpcSecret(),
    p_discord_user_id: discordUserId,
    p_roblox_user_id: robloxUserId,
    p_roblox_username: user.preferred_username ?? null,
    p_display_name: user.name ?? user.nickname ?? null,
    p_avatar_url: user.picture ?? null,
  });
  if (error) throw new Error(`supabase_link_failed:${error.message}`);
}

export async function unlinkRobloxAccount(discordUserId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("supabase_not_configured");
  const { error } = await supabase.rpc("unlink_roblox_account", {
    p_secret: rpcSecret(),
    p_discord_user_id: discordUserId,
  });
  if (error) throw new Error(`supabase_unlink_failed:${error.message}`);
}

export async function getRobloxLink(discordUserId: string): Promise<RobloxLink | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_roblox_link", {
    p_secret: rpcSecret(),
    p_discord_user_id: discordUserId,
  });
  if (error) throw new Error(`supabase_get_link_failed:${error.message}`);
  const rows = (data ?? []) as RobloxLink[];
  return rows.length > 0 ? rows[0] : null;
}
