import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { optionalEnv } from "./env";
import type { DiscordUser } from "./discord";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = optionalEnv("SUPABASE_URL");
  // Prefer the service role key; fall back to a publishable key (works with the
  // RLS policies defined in supabase/migrations). Both stay server-only.
  const key = optionalEnv("SUPABASE_SERVICE_ROLE_KEY") ?? optionalEnv("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) return null;
  if (!client) client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

/** Upserts the Discord identity after a successful OAuth login. Server-only. */
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
  if (error) throw new Error(`supabase_upsert_failed:${error.message}`);
}
