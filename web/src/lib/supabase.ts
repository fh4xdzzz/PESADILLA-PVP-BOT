import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { optionalEnv } from "./env";
import type { DiscordUser } from "./discord";

let publicClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

/** Server-side only. Never import in a client component. */
export function getAdminSupabase(): SupabaseClient | null {
  const url = optionalEnv("SUPABASE_URL");
  const key = optionalEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  if (!adminClient) adminClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return adminClient;
}

/** Compatibility fallback for earlier deployments. New admin APIs require getAdminSupabase. */
export function getSupabase(): SupabaseClient | null {
  const admin = getAdminSupabase();
  if (admin) return admin;
  const url = optionalEnv("SUPABASE_URL");
  const key = optionalEnv("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) return null;
  if (!publicClient) publicClient = createClient(url, key, { auth: { persistSession: false } });
  return publicClient;
}

export async function upsertDiscordUser(user: DiscordUser): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.rpc("upsert_discord_user", {
    p_discord_user_id: user.id,
    p_username: user.username,
    p_global_name: user.global_name ?? null,
    p_avatar_hash: user.avatar ?? null,
    p_locale: user.locale ?? null,
  });
  if (error) throw new Error("supabase_upsert_failed:" + error.message);
}
