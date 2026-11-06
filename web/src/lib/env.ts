export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export function appBaseUrl(): string {
  const url = optionalEnv("NEXT_PUBLIC_APP_URL") ?? optionalEnv("APP_BASE_URL");
  if (!url) throw new Error("Missing NEXT_PUBLIC_APP_URL");
  return url.replace(/\/+$/, "");
}

export function isDiscordConfigured(): boolean {
  return Boolean(optionalEnv("DISCORD_CLIENT_ID") && optionalEnv("DISCORD_CLIENT_SECRET") && optionalEnv("SESSION_SECRET"));
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    optionalEnv("SUPABASE_URL") &&
      (optionalEnv("SUPABASE_SERVICE_ROLE_KEY") || optionalEnv("SUPABASE_PUBLISHABLE_KEY"))
  );
}
