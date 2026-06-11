-- APdB Liga Maxi - Baja y solicitud de baja de jugadores
-- Ejecutar completo en Supabase SQL Editor, en una consulta nueva.
--
-- Objetivo:
-- 1) Permitir que Delegados soliciten baja/correccion de jugadores cargados por error.
-- 2) Permitir que Asociacion/Admin resuelva la solicitud.
-- 3) Si el jugador no tiene documentacion cargada/revisada, se elimina.
-- 4) Si tiene documentacion o auditoria util, se da de baja sin borrar historial.

alter table public.team_players
  add column if not exists baja_solicitada boolean not null default false,
  add column if not exists baja_motivo text,
  add column if not exists baja_solicitada_por text,
  add column if not exists baja_solicitada_en timestamptz,
  add column if not exists baja_resuelta_por text,
  add column if not exists baja_resuelta_en timestamptz;

create or replace function public.request_team_player_deactivation(
  p_player_id uuid,
  p_actor text default null,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.team_players
  set
    baja_solicitada = true,
    baja_motivo = coalesce(nullif(trim(p_reason), ''), 'Solicitud de baja/correccion'),
    baja_solicitada_por = p_actor,
    baja_solicitada_en = now(),
    updated_at = now()
  where id = p_player_id
    and activo = true;

  if not found then
    raise exception 'Jugador activo no encontrado: %', p_player_id;
  end if;
end;
$$;

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
  v_has_activity boolean;
begin
  select exists (
    select 1
    from public.player_documents
    where player_id = p_player_id
      and (
        storage_path is not null
        or file_name is not null
        or status <> 'pendiente'
        or reviewed_at is not null
      )
  )
  into v_has_activity;

  if not v_has_activity then
    delete from public.player_documents
    where player_id = p_player_id;

    delete from public.team_players
    where id = p_player_id;

    if not found then
      raise exception 'Jugador no encontrado: %', p_player_id;
    end if;

    return;
  end if;

  update public.team_players
  set
    activo = false,
    baja_solicitada = false,
    baja_resuelta_por = p_actor,
    baja_resuelta_en = now(),
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

drop view if exists public.v_player_documents_admin;

create view public.v_player_documents_admin as
select
  pd.id,
  pd.player_id,
  tp.nombre as jugador_nombre,
  tp.dni as jugador_dni,
  tp.dorsal as jugador_dorsal,
  tp.baja_solicitada,
  tp.baja_motivo,
  tp.baja_solicitada_por,
  tp.baja_solicitada_en,
  pd.requirement_id,
  dr.nombre as requirement_nombre,
  pd.organizacion_id,
  o.nombre as organizacion_nombre,
  pd.torneo_id,
  t.nombre as torneo_nombre,
  pd.categoria_id,
  c.nombre as categoria_nombre,
  pd.equipo_id,
  pd.equipo_nombre,
  pd.uploaded_by,
  pd.storage_path,
  pd.file_name,
  pd.file_type,
  pd.file_size,
  pd.status,
  pd.vencimiento,
  pd.observacion,
  pd.reviewed_by,
  pd.reviewed_at,
  pd.created_at,
  pd.updated_at
from public.player_documents pd
join public.team_players tp on tp.id = pd.player_id
left join public.document_requirements dr on dr.id = pd.requirement_id
left join public.organizaciones o on o.id = pd.organizacion_id
left join public.torneos t on t.id = pd.torneo_id
left join public.categorias c on c.id = pd.categoria_id
where tp.activo = true;

grant select on public.v_player_documents_admin to anon, authenticated;
grant execute on function public.request_team_player_deactivation(uuid, text, text) to anon, authenticated;
grant execute on function public.deactivate_team_player(uuid, text, text) to anon, authenticated;
