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
  const profile = {
    discord_user_id: user.id,
    username: user.username,
    global_name: user.global_name ?? null,
    avatar_hash: user.avatar ?? null,
    locale: user.locale ?? null,
    last_seen_at: new Date().toISOString(),
  };

  // Prefer the private service role, without requiring an exposed SECURITY DEFINER RPC.
  const admin = getAdminSupabase();
  if (admin) {
    const { error } = await admin.from("discord_users").upsert(profile, {
      onConflict: "discord_user_id",
    });
    if (error) throw new Error("discord_user_upsert_failed:" + error.code);
    return;
  }

  // Backward compatibility: the existing Supabase database uses a six-argument
  // RPC requiring a secret stored only in Vercel. Never pass it to a client component.
  const rpcSecret = optionalEnv("SUPABASE_RPC_SECRET");
  const client = getSupabase();
  if (!client || !rpcSecret) {
    throw new Error("supabase_server_credentials_missing");
  }
  const { error } = await client.rpc("upsert_discord_user", {
    p_secret: rpcSecret,
    p_discord_user_id: user.id,
    p_username: user.username,
    p_global_name: user.global_name ?? null,
    p_avatar_hash: user.avatar ?? null,
    p_locale: user.locale ?? null,
  });
  if (error) throw new Error("supabase_upsert_failed:" + error.code);
}
