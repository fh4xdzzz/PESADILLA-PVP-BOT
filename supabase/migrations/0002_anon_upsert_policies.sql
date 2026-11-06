-- Fase 1: la web escribe identidades Discord con la publishable key (rol anon).
-- Solo INSERT/UPDATE en discord_users; sin SELECT ni acceso a roblox_links.
-- NOTA: después se sustituyeron por la función RPC de 0003 (upsert via
-- PostgREST ON CONFLICT no pasa RLS de forma fiable).
create policy discord_users_insert_anon on public.discord_users
  for insert to anon with check (true);

create policy discord_users_update_anon on public.discord_users
  for update to anon using (true) with check (true);
