-- PESADILLA BOT v3: telemetría mínima de conexión bot -> web
create table if not exists public.guild_bot_status (
  guild_id text primary key,
  bot_user_id text not null,
  last_seen_at timestamptz not null default now()
);
alter table public.guild_bot_status enable row level security;
revoke all on table public.guild_bot_status from anon, authenticated;
-- Defensa en profundidad para las tablas del panel.
revoke all on table public.discord_oauth_tokens from anon, authenticated;
revoke all on table public.guild_configs from anon, authenticated;
-- Solo el servidor con service role debe escribir; no se exponen políticas públicas.
