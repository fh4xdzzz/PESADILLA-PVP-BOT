-- PESADILLA PVP BOT — esquema inicial (Fase 1)
-- Base exclusiva del proyecto. RLS activado sin políticas públicas:
-- solo el backend (service role) lee/escribe. El bot de Sparked Host usará
-- credenciales dedicadas de menor privilegio en una fase posterior.

create table if not exists public.discord_users (
  discord_user_id text primary key,
  username text not null,
  global_name text,
  avatar_hash text,
  locale text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.roblox_links (
  discord_user_id text primary key references public.discord_users(discord_user_id) on delete cascade,
  roblox_user_id bigint,
  roblox_username text,
  roblox_display_name text,
  status text not null default 'unlinked' check (status in ('unlinked', 'pending', 'linked')),
  linked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists roblox_links_roblox_user_id_key
  on public.roblox_links(roblox_user_id)
  where roblox_user_id is not null;

alter table public.discord_users enable row level security;
alter table public.roblox_links enable row level security;

-- Fase 1: la web escribe identidades Discord con la publishable key (rol anon).
-- Solo INSERT/UPDATE en discord_users; sin SELECT ni acceso a roblox_links.
create policy if not exists discord_users_insert_anon on public.discord_users
  for insert to anon with check (true);

create policy if not exists discord_users_update_anon on public.discord_users
  for update to anon using (true) with check (true);
