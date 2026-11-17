-- Base real PESADILLA BOT: la función upsert_discord_user existente acepta
-- SEIS parámetros (el primero es p_secret), y mantiene su validación segura
-- contra private.server_secrets. No modificarla ni revocar sus permisos.
-- La función antigua de CINCO parámetros, si existiera en otros despliegues,
-- no debe seguir siendo invocable desde la API pública.
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

revoke all on table public.discord_oauth_tokens, public.guild_configs
  from public, anon, authenticated;
grant select, insert, update, delete on
  public.discord_oauth_tokens, public.guild_configs to service_role;

do $migration$
begin
  if to_regprocedure('public.upsert_discord_user(text,text,text,text,text)') is not null then
    execute 'revoke all on function public.upsert_discord_user(text,text,text,text,text) from public, anon, authenticated';
  end if;
end
$migration$;
