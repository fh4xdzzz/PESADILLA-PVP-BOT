-- Fase 2: vinculación Roblox + endurecimiento de RPCs.
--
-- 1) Esquema `private` (no expuesto por PostgREST) para guardar un secreto
--    compartido web<->DB. Todas las funciones públicas exigen ese secreto:
--    sin él, un anon key filtrado no puede suplantar identidades ni tocar
--    vinculaciones ajenas.
-- 2) RPCs de vinculación con validación de unicidad en backend.
-- 3) Avatar de Roblox persistido para el dashboard.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.server_secrets (
  key text primary key,
  value text not null
);
revoke all on private.server_secrets from public, anon, authenticated;

alter table public.roblox_links
  add column if not exists roblox_avatar_url text;

-- upsert_discord_user ahora exige el secreto RPC (misma firma + p_secret).
drop function if exists public.upsert_discord_user(text, text, text, text, text);

create or replace function public.upsert_discord_user(
  p_secret text,
  p_discord_user_id text,
  p_username text,
  p_global_name text,
  p_avatar_hash text,
  p_locale text
) returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not exists (select 1 from private.server_secrets where key = 'rpc' and value = p_secret) then
    raise exception 'forbidden';
  end if;

  insert into public.discord_users
    (discord_user_id, username, global_name, avatar_hash, locale, last_seen_at)
  values
    (p_discord_user_id, p_username, p_global_name, p_avatar_hash, p_locale, now())
  on conflict (discord_user_id) do update set
    username = excluded.username,
    global_name = excluded.global_name,
    avatar_hash = excluded.avatar_hash,
    locale = excluded.locale,
    last_seen_at = now();
end;
$$;

-- Vincula una cuenta Roblox verificada por OAuth a un Discord concreto.
-- Reglas: 1 Discord = 1 Roblox; 1 Roblox = 1 Discord; el Discord debe existir.
create or replace function public.link_roblox_account(
  p_secret text,
  p_discord_user_id text,
  p_roblox_user_id bigint,
  p_roblox_username text,
  p_display_name text,
  p_avatar_url text
) returns text
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not exists (select 1 from private.server_secrets where key = 'rpc' and value = p_secret) then
    raise exception 'forbidden';
  end if;
  if not exists (select 1 from public.discord_users where discord_user_id = p_discord_user_id) then
    raise exception 'unknown_discord_user';
  end if;
  if exists (
    select 1 from public.roblox_links
    where roblox_user_id = p_roblox_user_id and discord_user_id <> p_discord_user_id
  ) then
    raise exception 'roblox_already_linked';
  end if;

  insert into public.roblox_links
    (discord_user_id, roblox_user_id, roblox_username, roblox_display_name,
     roblox_avatar_url, status, linked_at, updated_at)
  values
    (p_discord_user_id, p_roblox_user_id, p_roblox_username, p_display_name,
     p_avatar_url, 'linked', now(), now())
  on conflict (discord_user_id) do update set
    roblox_user_id = excluded.roblox_user_id,
    roblox_username = excluded.roblox_username,
    roblox_display_name = excluded.roblox_display_name,
    roblox_avatar_url = excluded.roblox_avatar_url,
    status = 'linked',
    linked_at = now(),
    updated_at = now();

  return 'linked';
end;
$$;

-- Desvincula la cuenta Roblox del Discord indicado.
create or replace function public.unlink_roblox_account(
  p_secret text,
  p_discord_user_id text
) returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not exists (select 1 from private.server_secrets where key = 'rpc' and value = p_secret) then
    raise exception 'forbidden';
  end if;

  delete from public.roblox_links where discord_user_id = p_discord_user_id;
end;
$$;

-- Lee la vinculación de un Discord concreto (solo datos propios).
create or replace function public.get_roblox_link(
  p_secret text,
  p_discord_user_id text
) returns table (
  roblox_user_id bigint,
  roblox_username text,
  roblox_display_name text,
  roblox_avatar_url text,
  status text,
  linked_at timestamptz
)
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not exists (select 1 from private.server_secrets where key = 'rpc' and value = p_secret) then
    raise exception 'forbidden';
  end if;

  return query
    select l.roblox_user_id, l.roblox_username, l.roblox_display_name,
           l.roblox_avatar_url, l.status, l.linked_at
    from public.roblox_links l
    where l.discord_user_id = p_discord_user_id;
end;
$$;

revoke all on function public.upsert_discord_user(text, text, text, text, text, text) from public;
revoke all on function public.link_roblox_account(text, text, bigint, text, text, text) from public;
revoke all on function public.unlink_roblox_account(text, text) from public;
revoke all on function public.get_roblox_link(text, text) from public;

grant execute on function public.upsert_discord_user(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.link_roblox_account(text, text, bigint, text, text, text) to anon, authenticated;
grant execute on function public.unlink_roblox_account(text, text) to anon, authenticated;
grant execute on function public.get_roblox_link(text, text) to anon, authenticated;
