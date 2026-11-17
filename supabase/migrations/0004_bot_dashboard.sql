-- Panel PESADILLA PVP BOT v2: un servidor solo puede configurarse desde
-- el backend tras comprobar sus permisos actuales en Discord.
-- Estas tablas NO exponen políticas a anon ni authenticated.
create table if not exists public.discord_oauth_tokens (
  discord_user_id text primary key references public.discord_users(discord_user_id) on delete cascade,
  access_token_ciphertext text not null,
  refresh_token_ciphertext text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table public.discord_oauth_tokens enable row level security;

create table if not exists public.guild_configs (
  guild_id text primary key,
  guild_name text not null,
  settings jsonb not null default '{}'::jsonb,
  updated_by text references public.discord_users(discord_user_id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.guild_configs enable row level security;

-- El antiguo RPC anon permitía escribir perfiles arbitrarios si se conocía
-- la clave pública. La nueva versión usa exclusivamente service role en el servidor.
revoke execute on function public.upsert_discord_user(text, text, text, text, text) from anon, authenticated;
