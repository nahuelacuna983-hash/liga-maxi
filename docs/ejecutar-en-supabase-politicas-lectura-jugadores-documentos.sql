-- APdB Liga Maxi - Politicas de lectura para jugadores y documentos
-- Ejecutar completo en Supabase SQL Editor.
--
-- Objetivo:
-- Permitir que la app vea jugadores y documentacion por jugador en las pantallas
-- de Delegados / Asociacion / Habilitados, luego de activar RLS.
--
-- No borra nada.
-- No toca partidos, resultados, torneos, fixtures ni claves.
--
-- Nota:
-- Esta es una politica de compatibilidad para la version actual de la app,
-- que todavia usa claves internas desde frontend. La etapa final debe migrar
-- estas lecturas a Auth + permisos por usuario/equipo.

alter table public.team_players enable row level security;
alter table public.player_documents enable row level security;

grant select on public.team_players to anon, authenticated;
grant select on public.player_documents to anon, authenticated;
grant select on public.v_player_documents_admin to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'team_players'
      and policyname = 'team_players_select_compat_app'
  ) then
    create policy team_players_select_compat_app
    on public.team_players
    for select
    to anon, authenticated
    using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'player_documents'
      and policyname = 'player_documents_select_compat_app'
  ) then
    create policy player_documents_select_compat_app
    on public.player_documents
    for select
    to anon, authenticated
    using (true);
  end if;
end $$;

select
  'OK_POLITICAS_LECTURA_JUGADORES_DOCUMENTOS' as control,
  relname as tabla,
  relrowsecurity as rls_activo
from pg_class
where relname in ('team_players', 'player_documents')
order by relname;
