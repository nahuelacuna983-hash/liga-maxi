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
declare actor public.app_users; target public.playoff_matches; category_id uuid := (p_payload->>'categoria_id')::uuid;
begin
  actor := public.apdb_admin_actor_for_category(category_id);
  if nullif(p_payload->>'fase','') is null or nullif(p_payload->>'llave','') is null then
    raise exception 'playoff phase and key are required' using errcode = '22023';
  end if;
  insert into public.playoff_matches (categoria_id, categoria_nombre, fase, llave, titulo, orden, partido_numero,
    fecha, local, visitante, puntos_local, puntos_visitante, estado, observacion, cargado_por, cargado_en, updated_at)
  values (category_id, p_payload->>'categoria_nombre', p_payload->>'fase', p_payload->>'llave',
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
