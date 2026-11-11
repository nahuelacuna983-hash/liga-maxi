-- Secure administrative scheduling and playoff writes for the isolated APdB environment.
-- These RPCs deliberately do not grant delegate access and never trust an organization id
-- supplied by the browser.

create or replace function public.apdb_admin_actor_for_category(p_categoria_id uuid)
returns public.app_users
language plpgsql
security definer
set search_path = public, auth
as $$
declare actor public.app_users;
begin
  select u.* into actor
  from public.app_users u
  join public.categorias c on c.id = p_categoria_id
  join public.torneos t on t.id = c.torneo_id and t.organizacion_id = u.organizacion_id
  where u.auth_user_id = auth.uid()
    and u.active
    and u.role in ('asociacion', 'admin_general')
  for update of u;
  if actor.id is null then
    raise exception 'actor not authorized for category' using errcode = '42501';
  end if;
  return actor;
end;
$$;

revoke all on function public.apdb_admin_actor_for_category(uuid) from public, anon;
grant execute on function public.apdb_admin_actor_for_category(uuid) to authenticated;

create or replace function public.apdb_upsert_match_schedule(p_payload jsonb)
returns public.match_schedules
language plpgsql
security definer
set search_path = public, auth
as $$
declare actor public.app_users; target public.match_schedules; match_row public.partidos;
begin
  actor := public.apdb_admin_actor_for_category((p_payload->>'categoria_id')::uuid);
  select * into match_row from public.partidos where id = (p_payload->>'partido_id')::uuid
    and categoria_id = (p_payload->>'categoria_id')::uuid for update;
  if match_row.id is null then raise exception 'match does not belong to category' using errcode = '23503'; end if;
  if nullif(p_payload->>'fecha_partido','') is not null and exists (
    select 1 from public.categorias c
    where c.id = match_row.categoria_id
      and (c.fechas_bloqueadas ? (p_payload->>'fecha_partido'))
  ) then
    raise exception 'scheduled date is blocked for category' using errcode = '22007';
  end if;

  insert into public.match_schedules (partido_id, categoria_id, categoria_nombre, jornada, local, visitante,
    fecha_partido, hora, cancha, estado, observacion, informado_por, informado_en, updated_at)
  values (match_row.id, match_row.categoria_id, p_payload->>'categoria_nombre', match_row.jornada,
    match_row.local, match_row.visitante, nullif(p_payload->>'fecha_partido','')::date,
    nullif(p_payload->>'hora','')::time, nullif(p_payload->>'cancha',''),
    coalesce(nullif(p_payload->>'estado',''), 'pendiente'), p_payload->>'observacion',
    case when p_payload->>'estado' = 'enviado' then actor.display_name else null end,
    case when p_payload->>'estado' = 'enviado' then now() else null end, now())
  on conflict (partido_id) do update set
    fecha_partido = excluded.fecha_partido, hora = excluded.hora, cancha = excluded.cancha,
    estado = excluded.estado, observacion = excluded.observacion,
    informado_por = coalesce(excluded.informado_por, match_schedules.informado_por),
    informado_en = coalesce(excluded.informado_en, match_schedules.informado_en), updated_at = now()
  returning * into target;
  return target;
end;
$$;

revoke all on function public.apdb_upsert_match_schedule(jsonb) from public, anon;
grant execute on function public.apdb_upsert_match_schedule(jsonb) to authenticated;

create or replace function public.apdb_upsert_playoff_match(p_payload jsonb)
returns public.playoff_matches
language plpgsql
security definer
set search_path = public, auth
as $$
declare actor public.app_users; target public.playoff_matches; existing public.playoff_matches; v_category_id uuid := (p_payload->>'categoria_id')::uuid;
begin
  actor := public.apdb_admin_actor_for_category(v_category_id);
  if nullif(p_payload->>'fase','') is null or nullif(p_payload->>'llave','') is null then
    raise exception 'playoff phase and key are required' using errcode = '22023';
  end if;
  select * into existing
    from public.playoff_matches
   where playoff_matches.categoria_id = v_category_id
     and fase = p_payload->>'fase'
     and llave = p_payload->>'llave'
     and partido_numero = coalesce((p_payload->>'partido_numero')::integer, 1)
   for update;
  if existing.id is not null and existing.puntos_local is not null and existing.puntos_visitante is not null
     and (existing.puntos_local is distinct from (p_payload->>'puntos_local')::integer
       or existing.puntos_visitante is distinct from (p_payload->>'puntos_visitante')::integer
       or existing.local is distinct from p_payload->>'local'
       or existing.visitante is distinct from p_payload->>'visitante') then
    raise exception 'playoff match already has an immutable result' using errcode = '55000';
  end if;
  insert into public.playoff_matches (categoria_id, categoria_nombre, fase, llave, titulo, orden, partido_numero,
    fecha, local, visitante, puntos_local, puntos_visitante, estado, observacion, cargado_por, cargado_en, updated_at)
  values (v_category_id, p_payload->>'categoria_nombre', p_payload->>'fase', p_payload->>'llave',
    p_payload->>'titulo', coalesce((p_payload->>'orden')::integer,0), coalesce((p_payload->>'partido_numero')::integer,1),
    nullif(p_payload->>'fecha','')::date, p_payload->>'local', p_payload->>'visitante',
    (p_payload->>'puntos_local')::integer, (p_payload->>'puntos_visitante')::integer,
    coalesce(nullif(p_payload->>'estado',''),'pendiente'), p_payload->>'observacion', actor.display_name, now(), now())
  on conflict (categoria_id, fase, llave, partido_numero) do update set
    titulo=excluded.titulo, orden=excluded.orden, fecha=excluded.fecha, local=excluded.local,
    visitante=excluded.visitante, puntos_local=excluded.puntos_local, puntos_visitante=excluded.puntos_visitante,
    estado=excluded.estado, observacion=excluded.observacion, cargado_por=excluded.cargado_por,
    cargado_en=excluded.cargado_en, updated_at=now()
  returning * into target;
  return target;
end;
$$;

revoke all on function public.apdb_upsert_playoff_match(jsonb) from public, anon;
grant execute on function public.apdb_upsert_playoff_match(jsonb) to authenticated;

-- All writes must go through the authenticated RPCs above.
revoke insert, update, delete on public.match_schedules from anon, authenticated;
revoke insert, update, delete on public.playoff_matches from anon, authenticated;

create or replace function public.apdb_publish_fixture(
  p_categoria_id uuid,
  p_category_payload jsonb,
  p_matches jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare actor public.app_users; current_count integer; inserted_count integer;
begin
  actor := public.apdb_admin_actor_for_category(p_categoria_id);
  select count(*) into current_count from public.partidos where categoria_id = p_categoria_id;
  if current_count > 0 then
    raise exception 'fixture already published for category' using errcode = '55006';
  end if;
  if jsonb_typeof(p_matches) <> 'array' or jsonb_array_length(p_matches) = 0 then
    raise exception 'fixture must contain matches' using errcode = '22023';
  end if;
  insert into public.partidos (categoria_id, local, visitante, jornada, fecha, libre,
    puntos_local, puntos_visitante, estado_resultado, cargado_por, cargado_en)
  select p_categoria_id, x.local, x.visitante, x.jornada, x.fecha, x.libre,
    null, null, 'pendiente', null, null
  from jsonb_to_recordset(p_matches) as x(
    local text, visitante text, jornada integer, fecha date, libre text
  );
  get diagnostics inserted_count = row_count;
  update public.categorias set
    estado = coalesce(p_category_payload->>'estado', estado),
    formato = coalesce(p_category_payload->>'formato', formato),
    playoffs = coalesce((p_category_payload->>'playoffs')::boolean, playoffs),
    clasificados = coalesce((p_category_payload->>'clasificados')::integer, clasificados),
    dia_juego = coalesce((p_category_payload->>'dia_juego')::integer, dia_juego),
    fecha_inicio = coalesce((p_category_payload->>'fecha_inicio')::date, fecha_inicio),
    fecha_fin = coalesce((p_category_payload->>'fecha_fin')::date, fecha_fin),
    frecuencia = coalesce((p_category_payload->>'frecuencia')::integer, frecuencia),
    fechas_bloqueadas = coalesce(p_category_payload->'fechas_bloqueadas', fechas_bloqueadas),
    series_playoff = coalesce(p_category_payload->'series_playoff', series_playoff)
  where id = p_categoria_id;
  return inserted_count;
end;
$$;

revoke all on function public.apdb_publish_fixture(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.apdb_publish_fixture(uuid, jsonb, jsonb) to authenticated;
revoke insert, update, delete on public.categorias from anon, authenticated;
