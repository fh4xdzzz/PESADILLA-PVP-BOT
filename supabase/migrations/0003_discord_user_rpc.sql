-- Sustituye el upsert directo por una función SECURITY DEFINER de un solo
-- propósito. Evita exponer SELECT/UPDATE amplios al rol anon y esquiva la
-- limitación de RLS en INSERT ... ON CONFLICT via PostgREST.
create or replace function public.upsert_discord_user(
  p_discord_user_id text,
  p_username text,
  p_global_name text,
  p_avatar_hash text,
  p_locale text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
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

revoke all on function public.upsert_discord_user(text, text, text, text, text) from public;
grant execute on function public.upsert_discord_user(text, text, text, text, text) to anon, authenticated;

drop policy if exists discord_users_insert_anon on public.discord_users;
drop policy if exists discord_users_update_anon on public.discord_users;
