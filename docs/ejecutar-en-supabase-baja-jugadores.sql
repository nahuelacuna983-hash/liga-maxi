-- APdB Liga Maxi - Baja administrativa de jugadores
-- Ejecutar completo en Supabase SQL Editor, en una consulta nueva.
--
-- Objetivo:
-- Permitir que Asociacion/Admin quite de la pantalla operativa jugadores cargados por error,
-- sin borrar fisicamente documentos ni auditoria.

create or replace function public.deactivate_team_player(
  p_player_id uuid,
  p_actor text default null,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc record;
begin
  update public.team_players
  set
    activo = false,
    updated_at = now()
  where id = p_player_id;

  if not found then
    raise exception 'Jugador no encontrado: %', p_player_id;
  end if;

  for v_doc in
    select id
    from public.player_documents
    where player_id = p_player_id
  loop
    insert into public.player_document_events (
      player_document_id,
      event_type,
      actor,
      detail
    )
    values (
      v_doc.id,
      'jugador_baja_administrativa',
      p_actor,
      coalesce(nullif(trim(p_reason), ''), 'Baja administrativa de jugador cargado por error')
    );
  end loop;
end;
$$;

grant execute on function public.deactivate_team_player(uuid, text, text) to anon, authenticated;
