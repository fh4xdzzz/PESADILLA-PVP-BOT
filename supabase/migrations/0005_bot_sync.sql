-- Estado de sincronización bot -> panel, limitado a servidor autenticado.
create table if not exists public.guild_bot_status (
  guild_id text primary key,
  bot_user_id text not null,
  last_seen_at timestamptz not null default now()
);
alter table public.guild_bot_status enable row level security;
revoke all on table public.guild_bot_status from public, anon, authenticated;
grant select, insert, update, delete on public.guild_bot_status to service_role;
-- Reafirmar aislamiento de las tablas privadas del panel:
revoke all on table public.discord_oauth_tokens, public.guild_configs
  from public, anon, authenticated;
