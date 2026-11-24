-- APdB 2027 staging-specific differential, first tested only on a disposable clone.
-- Baseline: 20261123163609 / PostgreSQL 17, legacy document schema.
-- NEVER execute on hosted staging without completed Pack A restore + written change approval.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
DO $baseline$
DECLARE
  v_seen text;
  v_policy_count int;
BEGIN
  SELECT max(version) INTO v_seen FROM supabase_migrations.schema_migrations;
  IF v_seen IS DISTINCT FROM '20261123163609' THEN
    RAISE EXCEPTION 'APDB_DIFFERENTIAL_BASELINE_CHANGED: migration %', v_seen;
  END IF;
  IF current_setting('server_version_num')::int < 150000 THEN
    RAISE EXCEPTION 'APDB_REQUIRES_POSTGRES_15';
  END IF;
  IF to_regclass('public.apdb_player_eligibility_events') IS NOT NULL
    OR to_regprocedure('public.apdb_set_player_eligibility(uuid,text,text)') IS NOT NULL
    OR to_regprocedure('public.apdb_list_team_documents(uuid)') IS NOT NULL
    OR to_regprocedure('public.apdb_list_player_documents(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'APDB_DIFFERENTIAL_EXPECTED_OBJECT_ABSENT';
  END IF;
  IF to_regprocedure('public.apdb_storage_team_path_allowed(text,text)') IS NULL
    OR to_regprocedure('public.apdb_storage_path_allowed(text,text)') IS NOT NULL
    OR to_regprocedure('public.apdb_document_access_allowed(uuid,uuid,uuid)') IS NULL
    OR to_regclass('public.document_events') IS NULL
    OR to_regclass('public.document_files') IS NULL
    OR to_regclass('public.team_players') IS NULL
    OR to_regclass('public.v_team_documents_admin') IS NULL
    OR to_regclass('public.v_player_documents_admin') IS NULL THEN
    RAISE EXCEPTION 'APDB_DIFFERENTIAL_MISSING_OR_UNEXPECTED_BASELINE';
  END IF;
  SELECT count(*) INTO v_policy_count FROM pg_policies
  WHERE schemaname='storage' AND tablename='objects'
    AND policyname IN ('apdb_documents_select','apdb_documents_insert','apdb_documents_update','apdb_documents_delete')
    AND (coalesce(qual,'') || coalesce(with_check,'')) LIKE '%apdb_storage_team_path_allowed%';
  IF v_policy_count <> 4 THEN
    RAISE EXCEPTION 'APDB_STORAGE_POLICY_DRIFT: expected 4, got %',v_policy_count;
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.team_players'::regclass)
     OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.team_documents'::regclass)
     OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.player_documents'::regclass)
     OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.document_requirements'::regclass) THEN
    RAISE EXCEPTION 'APDB_REQUIRED_RLS_DISABLED';
  END IF;
END;
$baseline$;

-- Source candidate 20261123000000 (eligibility events)
-- APdB 2027: independent, append-only sporting eligibility decisions.
-- Intended for disposable isolated Supabase first; not approved for hosted environments.
begin;

create table public.apdb_player_eligibility_events (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.team_players(id),
  organizacion_id uuid not null references public.organizaciones(id),
  torneo_id uuid not null references public.torneos(id),
  categoria_id uuid not null references public.categorias(id),
  equipo_id uuid not null references public.equipos(id),
  status text not null check (status in ('habilitado', 'suspendido')),
  reason text not null check (length(btrim(reason)) between 5 and 2000),
  actor_auth_user_id uuid not null,
  actor_app_user_id uuid not null references public.app_users(id),
  created_at timestamptz not null default clock_timestamp()
);
create index apdb_player_eligibility_events_latest
  on public.apdb_player_eligibility_events(player_id, created_at desc, id desc);

alter table public.apdb_player_eligibility_events enable row level security;
revoke all on table public.apdb_player_eligibility_events from public, anon, authenticated;

-- Invalidate any prior 2027 decision after a roster scope change, including
-- when a player later returns to a previously authorized team.
create function public.apdb_stamp_player_roster_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $apdb_roster$
begin
  if (
    old.organizacion_id is distinct from new.organizacion_id
    or old.torneo_id is distinct from new.torneo_id
    or old.categoria_id is distinct from new.categoria_id
    or old.equipo_id is distinct from new.equipo_id
    or old.activo is distinct from new.activo
  ) and exists (
    select 1 from public.torneos t where t.id = new.torneo_id and t.temporada = '2027'
  ) then
    new.updated_at := clock_timestamp();
  end if;
  return new;
end;
$apdb_roster$;
create trigger apdb_2027_player_roster_change
before update of organizacion_id, torneo_id, categoria_id, equipo_id, activo
on public.team_players
for each row execute function public.apdb_stamp_player_roster_change();
revoke all on function public.apdb_stamp_player_roster_change() from public, anon, authenticated;


create function public.apdb_set_player_eligibility(
  p_player_id uuid,
  p_status text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_actor public.app_users%rowtype;
  v_player public.team_players%rowtype;
  v_season text;
  v_event_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'autenticacion requerida';
  end if;
  if p_status is null or p_status not in ('habilitado', 'suspendido') then
    raise exception using errcode = '22023', message = 'decision deportiva invalida';
  end if;
  if p_reason is null or length(btrim(p_reason)) not between 5 and 2000 then
    raise exception using errcode = '22023', message = 'motivo obligatorio (5 a 2000 caracteres)';
  end if;
  select * into v_actor from public.app_users
    where auth_user_id = auth.uid()
      and active
      and role in ('admin_general', 'asociacion');
  if not found then
    raise exception using errcode = '42501', message = 'identidad sin autorizacion institucional';
  end if;
  select * into v_player from public.team_players where id = p_player_id for update;
  if not found or not v_player.activo
     or v_player.organizacion_id is distinct from v_actor.organizacion_id
     or v_player.torneo_id is null
     or v_player.categoria_id is null
     or v_player.equipo_id is null then
    raise exception using errcode = '42501', message = 'jugador fuera del alcance institucional';
  end if;
  select t.temporada into v_season
    from public.torneos t
    join public.categorias c on c.torneo_id = t.id
    join public.equipos e on e.categoria_id = c.id
    where t.id = v_player.torneo_id
      and t.organizacion_id = v_actor.organizacion_id
      and c.id = v_player.categoria_id
      and e.id = v_player.equipo_id;
  if not found or v_season is distinct from '2027' then
    raise exception using errcode = '42501', message = 'la decision solo se permite para temporada 2027';
  end if;
  if not exists (
    select 1 from public.app_user_permissions p
    where p.user_id = v_actor.id
      and p.organizacion_id = v_actor.organizacion_id
      and p.torneo_id = v_player.torneo_id
      and p.categoria_id = v_player.categoria_id
      and p.can_review_documents = true
      and (p.equipo_id = v_player.equipo_id or p.equipo_id is null)
  ) then
    raise exception using errcode = '42501', message = 'sin permiso de revision en categoria y equipo';
  end if;

  if p_status = 'habilitado' then
    -- Never permit a positive decision without an active requirement catalog.
    if not exists (
      select 1 from public.document_requirements r
      where r.activo and r.obligatorio
        and r.organizacion_id = v_player.organizacion_id
        and r.torneo_id = v_player.torneo_id
        and (r.categoria_id = v_player.categoria_id or r.categoria_id is null)
    ) then
      raise exception using errcode = '23514', message = 'requisitos institucionales aun no configurados';
    end if;
    if exists (
      select 1
      from public.document_requirements r
      where r.activo and r.obligatorio
        and r.organizacion_id = v_player.organizacion_id
        and r.torneo_id = v_player.torneo_id
        and (r.categoria_id = v_player.categoria_id or r.categoria_id is null)
        and (
          (r.scope = 'player' and not exists (
            select 1 from public.player_documents d
             where d.player_id = v_player.id and d.requirement_id = r.id
               and d.organizacion_id = v_player.organizacion_id
               and d.torneo_id = v_player.torneo_id
               and d.categoria_id = v_player.categoria_id
               and d.equipo_id = v_player.equipo_id
               and d.status = 'aprobado'
               and (not r.requiere_vencimiento or d.vencimiento >= current_date)
          ))
          or
          (r.scope = 'team' and not exists (
            select 1 from public.team_documents d
             where d.equipo_id = v_player.equipo_id and d.requirement_id = r.id
               and d.organizacion_id = v_player.organizacion_id
               and d.torneo_id = v_player.torneo_id
               and d.categoria_id = v_player.categoria_id
               and d.status = 'aprobado'
               and (not r.requiere_vencimiento or d.vencimiento >= current_date)
          ))
        )
    ) then
      raise exception using errcode = '23514', message = 'documentacion obligatoria incompleta o vencida';
    end if;
  end if;

  insert into public.apdb_player_eligibility_events (
    player_id, organizacion_id, torneo_id, categoria_id, equipo_id,
    status, reason, actor_auth_user_id, actor_app_user_id
  ) values (
    v_player.id, v_actor.organizacion_id, v_player.torneo_id, v_player.categoria_id,
    v_player.equipo_id, p_status, btrim(p_reason), auth.uid(), v_actor.id
  ) returning id into v_event_id;
  return v_event_id;
end;
$$;

create function public.apdb_get_player_eligibility(p_category_id uuid)
returns table (
  player_id uuid,
  status text,
  reason text,
  actor_name text,
  decided_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare v_actor public.app_users%rowtype;
begin
  select * into v_actor from public.app_users
  where auth_user_id = auth.uid() and active and role in ('admin_general','asociacion');
  if not found or not exists (
    select 1 from public.app_user_permissions p
    where p.user_id = v_actor.id
      and p.organizacion_id = v_actor.organizacion_id
      and p.categoria_id = p_category_id and p.can_review_documents
  ) then
    raise exception using errcode = '42501', message = 'sin permiso de consulta institucional';
  end if;
  return query
    select distinct on (e.player_id)
      e.player_id, e.status, e.reason, u.display_name, e.created_at
    from public.apdb_player_eligibility_events e
    join public.app_users u on u.id = e.actor_app_user_id
    where e.categoria_id = p_category_id
      and e.organizacion_id = v_actor.organizacion_id
      and exists (
        select 1 from public.team_players tp
        where tp.id = e.player_id and tp.activo
          and tp.organizacion_id = e.organizacion_id
          and tp.torneo_id = e.torneo_id
          and tp.categoria_id = e.categoria_id
          and tp.equipo_id = e.equipo_id
          and e.created_at >= tp.updated_at
      )
      and exists (
        select 1 from public.app_user_permissions p
        where p.user_id = v_actor.id and p.organizacion_id = e.organizacion_id
          and p.torneo_id = e.torneo_id
          and p.categoria_id = e.categoria_id
          and p.can_review_documents
          and (p.equipo_id is null or p.equipo_id = e.equipo_id)
      )
    order by e.player_id, e.created_at desc, e.id desc;
end;
$$;
revoke all on function public.apdb_set_player_eligibility(uuid,text,text) from public, anon, authenticated;
revoke all on function public.apdb_get_player_eligibility(uuid) from public, anon, authenticated;
grant execute on function public.apdb_set_player_eligibility(uuid,text,text) to authenticated;
grant execute on function public.apdb_get_player_eligibility(uuid) to authenticated;
-- Association-only candidate list. Never expose the legacy document view
-- or all team_players to authenticated users to populate this selector.
create function public.apdb_list_player_eligibility_candidates(p_category_id uuid)
returns table (player_id uuid, equipo_nombre text, nombre text)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_actor public.app_users%rowtype;
begin
  select * into v_actor from public.app_users
  where auth_user_id = auth.uid() and active and role in ('admin_general','asociacion');
  if not found then
    raise exception using errcode = '42501', message = 'identidad institucional requerida';
  end if;
  if not exists (
    select 1 from public.app_user_permissions p
    where p.user_id = v_actor.id and p.organizacion_id = v_actor.organizacion_id
      and p.categoria_id = p_category_id and p.can_review_documents
  ) then
    raise exception using errcode = '42501', message = 'sin permiso de lectura institucional';
  end if;
  return query
    select tp.id, tp.equipo_nombre, tp.nombre
    from public.team_players tp
    join public.torneos t on t.id = tp.torneo_id and t.organizacion_id = v_actor.organizacion_id
    join public.categorias c on c.id = tp.categoria_id and c.torneo_id = t.id
    join public.equipos e on e.id = tp.equipo_id and e.categoria_id = c.id
    where tp.categoria_id = p_category_id
      and tp.organizacion_id = v_actor.organizacion_id
      and t.temporada = '2027'
      and tp.activo
      and exists (
        select 1 from public.app_user_permissions p
        where p.user_id = v_actor.id and p.organizacion_id = tp.organizacion_id
          and p.torneo_id = tp.torneo_id and p.categoria_id = tp.categoria_id
          and p.can_review_documents
          and (p.equipo_id is null or p.equipo_id = tp.equipo_id)
      )
    order by tp.equipo_nombre, tp.nombre, tp.id;
end;
$$;
revoke all on function public.apdb_list_player_eligibility_candidates(uuid) from public, anon, authenticated;
grant execute on function public.apdb_list_player_eligibility_candidates(uuid) to authenticated;
-- Referee-ready view: verified on each read against the latest institutional
-- decision AND today's mandatory document status. Never trust browser caches.
create function public.apdb_get_referee_eligibility(p_category_id uuid)
returns table (
  player_id uuid,
  equipo_nombre text,
  nombre text,
  dni text,
  dorsal text,
  documentacion_completa boolean,
  habilitado boolean,
  decision_status text,
  motivo text,
  decided_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_actor public.app_users%rowtype;
begin
  select * into v_actor from public.app_users
   where auth_user_id = auth.uid() and active and role in ('admin_general','asociacion');
  if not found or not exists (
    select 1 from public.app_user_permissions p
    where p.user_id = v_actor.id and p.organizacion_id = v_actor.organizacion_id
      and p.categoria_id = p_category_id and p.can_review_documents
  ) then
    raise exception using errcode = '42501', message = 'sin permiso para lista de arbitros';
  end if;
  return query
    select tp.id, tp.equipo_nombre, tp.nombre, tp.dni, tp.dorsal,
      docs.completa,
      coalesce(docs.completa and latest.status = 'habilitado', false) as habilitado,
      coalesce(latest.status, 'pendiente') as decision_status,
      latest.reason, latest.created_at
    from public.team_players tp
    join public.torneos t on t.id = tp.torneo_id and t.organizacion_id = v_actor.organizacion_id
    join public.categorias c on c.id = tp.categoria_id and c.torneo_id = t.id
    join public.equipos e on e.id = tp.equipo_id and e.categoria_id = c.id
    left join lateral (
      select ev.status, ev.reason, ev.created_at
      from public.apdb_player_eligibility_events ev
      where ev.player_id = tp.id
        and ev.organizacion_id = tp.organizacion_id
        and ev.torneo_id = tp.torneo_id
        and ev.categoria_id = tp.categoria_id
        and ev.equipo_id = tp.equipo_id
        and ev.created_at >= tp.updated_at
      order by ev.created_at desc, ev.id desc
      limit 1
    ) latest on true
    cross join lateral (
      select
        exists (
          select 1 from public.document_requirements r
          where r.activo and r.obligatorio
            and r.organizacion_id = tp.organizacion_id
            and r.torneo_id = tp.torneo_id
            and (r.categoria_id = tp.categoria_id or r.categoria_id is null)
        )
        and not exists (
          select 1 from public.document_requirements r
          where r.activo and r.obligatorio
            and r.organizacion_id = tp.organizacion_id
            and r.torneo_id = tp.torneo_id
            and (r.categoria_id = tp.categoria_id or r.categoria_id is null)
            and (
              (r.scope = 'player' and not exists (
                select 1 from public.player_documents d
                where d.player_id = tp.id and d.requirement_id = r.id
                  and d.organizacion_id = tp.organizacion_id
                  and d.torneo_id = tp.torneo_id
                  and d.categoria_id = tp.categoria_id
                  and d.equipo_id = tp.equipo_id
                  and d.status = 'aprobado'
                  and (not r.requiere_vencimiento or d.vencimiento >= current_date)
              ))
              or (r.scope = 'team' and not exists (
                select 1 from public.team_documents d
                where d.equipo_id = tp.equipo_id and d.requirement_id = r.id
                  and d.organizacion_id = tp.organizacion_id
                  and d.torneo_id = tp.torneo_id
                  and d.categoria_id = tp.categoria_id
                  and d.status = 'aprobado'
                  and (not r.requiere_vencimiento or d.vencimiento >= current_date)
              ))
            )
        ) as completa
    ) docs
    where tp.categoria_id = p_category_id
      and tp.organizacion_id = v_actor.organizacion_id
      and tp.activo and t.temporada = '2027'
      and exists (
        select 1 from public.app_user_permissions p
        where p.user_id = v_actor.id and p.organizacion_id = tp.organizacion_id
          and p.torneo_id = tp.torneo_id and p.categoria_id = tp.categoria_id
          and p.can_review_documents
          and (p.equipo_id is null or p.equipo_id = tp.equipo_id)
      )
    order by tp.equipo_nombre, tp.nombre, tp.id;
end;
$$;
revoke all on function public.apdb_get_referee_eligibility(uuid) from public, anon, authenticated;
grant execute on function public.apdb_get_referee_eligibility(uuid) to authenticated;

-- Full chronological evidence for a player. Readable only by Association
-- with effective permission for the exact player and team.
create function public.apdb_get_player_eligibility_history(p_player_id uuid)
returns table (
  status text,
  reason text,
  actor_name text,
  decided_at timestamptz,
  event_id uuid
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_actor public.app_users%rowtype;
  v_player public.team_players%rowtype;
begin
  select * into v_actor from public.app_users
  where auth_user_id = auth.uid()
    and active and role in ('admin_general','asociacion');
  if not found then
    raise exception using errcode = '42501', message = 'identidad institucional requerida';
  end if;
  select * into v_player from public.team_players
  where id = p_player_id and organizacion_id = v_actor.organizacion_id;
  if not found or not exists (
    select 1 from public.app_user_permissions p
    where p.user_id = v_actor.id
      and p.organizacion_id = v_player.organizacion_id
      and p.torneo_id = v_player.torneo_id
      and p.categoria_id = v_player.categoria_id
      and p.can_review_documents
      and (p.equipo_id is null or p.equipo_id = v_player.equipo_id)
  ) then
    raise exception using errcode = '42501', message = 'sin permiso sobre historial del jugador';
  end if;
  return query
    select ev.status, ev.reason, u.display_name, ev.created_at, ev.id
    from public.apdb_player_eligibility_events ev
    join public.app_users u on u.id = ev.actor_app_user_id
    where ev.player_id = v_player.id
      and ev.organizacion_id = v_actor.organizacion_id
      and ev.torneo_id = v_player.torneo_id
      and ev.categoria_id = v_player.categoria_id
      and ev.equipo_id = v_player.equipo_id
    order by ev.created_at desc, ev.id desc;
end;
$$;
revoke all on function public.apdb_get_player_eligibility_history(uuid) from public, anon, authenticated;
grant execute on function public.apdb_get_player_eligibility_history(uuid) to authenticated;

-- Source candidate 20261125000000 (adapted to staging Storage scope)
-- APdB 2027: authenticated documentary circuit for the original online client.
-- This file is applied only to ephemeral Supabase CI before any release review.
begin;

create or replace function public.apdb_document_scope_allowed(
  p_org uuid, p_tournament uuid, p_category uuid, p_team uuid, p_review boolean
) returns boolean
language sql stable security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1 from public.app_users au
    join public.app_user_permissions p on p.user_id = au.id
    where au.auth_user_id = auth.uid() and au.active
      and au.organizacion_id = p_org
      and p.organizacion_id = p_org
      and p.torneo_id = p_tournament and p.categoria_id = p_category
      and (p.equipo_id is null or p.equipo_id = p_team)
      and (
        (p_review and au.role in ('asociacion','admin_general') and p.can_review_documents)
        or (not p_review and au.role = 'delegado' and p.equipo_id = p_team
          and p.can_view and p.can_load_documents)
      )
      and exists (
        select 1 from public.equipos e
        join public.categorias c on c.id = e.categoria_id
        join public.torneos t on t.id = c.torneo_id
        where e.id = p_team and c.id = p_category and t.id = p_tournament
          and t.organizacion_id = p_org and t.temporada = '2027'
      )
  );
$$;
revoke all on function public.apdb_document_scope_allowed(uuid,uuid,uuid,uuid,boolean) from public, anon, authenticated;
grant execute on function public.apdb_document_scope_allowed(uuid,uuid,uuid,uuid,boolean) to authenticated;

create function public.add_team_player(
  p_organizacion_id uuid,
  p_torneo_id uuid,
  p_categoria_id uuid,
  p_equipo_id uuid,
  p_equipo_nombre text,
  p_nombre text,
  p_dni text,
  p_dorsal text,
  p_created_by text
) returns uuid
language plpgsql security definer set search_path = public, auth, pg_temp
as $$
declare
  v_org uuid;
  v_team public.equipos%rowtype;
  v_player_id uuid;
  v_actor public.app_users%rowtype;
begin
  select e.* into v_team
  from public.equipos e join public.categorias c on c.id=e.categoria_id
  join public.torneos t on t.id=c.torneo_id
  where e.id=p_equipo_id and c.id=p_categoria_id and t.id=p_torneo_id
    and t.temporada='2027';
  if not found then
    raise exception using errcode='42501',message='equipo/torneo fuera de 2027';
  end if;
  select t.organizacion_id into v_org from public.torneos t where t.id=p_torneo_id;
  if (p_organizacion_id is not null and p_organizacion_id <> v_org)
     or coalesce(trim(p_nombre),'') = '' or char_length(p_nombre)>150
     or nullif(trim(p_equipo_nombre),'') is null
     or p_equipo_nombre is distinct from v_team.nombre
     or not public.apdb_document_scope_allowed(v_org,p_torneo_id,p_categoria_id,p_equipo_id,false) then
    raise exception using errcode='42501',message='alta de jugador no autorizada';
  end if;
  select * into v_actor from public.app_users where auth_user_id=auth.uid() and active;
  perform pg_advisory_xact_lock(hashtextextended(
    p_equipo_id::text||':'||lower(trim(p_nombre))||':'||coalesce(nullif(trim(p_dni),''),'sin-dni'),0
  ));
  if exists (
    select 1 from public.team_players tp
    where tp.categoria_id=p_categoria_id and tp.equipo_id=p_equipo_id and tp.activo
      and (nullif(trim(p_dni),'') is not null and tp.dni=trim(p_dni)
        or lower(trim(tp.nombre))=lower(trim(p_nombre)))
  ) then
    raise exception using errcode='23505',message='jugador ya registrado en equipo';
  end if;
  insert into public.team_players(
    organizacion_id,torneo_id,categoria_id,equipo_id,equipo_nombre,nombre,dni,dorsal,created_by
  ) values(
    v_org,p_torneo_id,p_categoria_id,p_equipo_id,v_team.nombre,trim(p_nombre),
    nullif(trim(p_dni),''),nullif(trim(p_dorsal),''),v_actor.display_name
  ) returning id into v_player_id;
  insert into public.player_documents(
    player_id,requirement_id,organizacion_id,torneo_id,categoria_id,
    equipo_id,equipo_nombre,status
  )
  select v_player_id,r.id,v_org,p_torneo_id,p_categoria_id,
    p_equipo_id,v_team.nombre,'pendiente'
  from public.document_requirements r
  where r.activo and r.scope='player' and r.organizacion_id=v_org
    and r.torneo_id=p_torneo_id and (r.categoria_id=p_categoria_id or r.categoria_id is null);
  return v_player_id;
end;
$$;
revoke all on function public.add_team_player(uuid,uuid,uuid,uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.add_team_player(uuid,uuid,uuid,uuid,text,text,text,text,text) to authenticated;

create function public.mark_player_document_uploaded(
  p_document_id uuid,
  p_uploaded_by text,
  p_storage_path text,
  p_file_name text,
  p_file_type text,
  p_file_size bigint,
  p_vencimiento date default null
) returns boolean
language plpgsql security definer set search_path=public,auth,pg_temp
as $$
declare v_doc public.player_documents%rowtype;
declare v_actor public.app_users%rowtype;
begin
  select * into v_doc from public.player_documents where id=p_document_id for update;
  if not found or not public.apdb_document_scope_allowed(
    v_doc.organizacion_id,v_doc.torneo_id,v_doc.categoria_id,v_doc.equipo_id,false)
    or p_file_size is null or p_file_size<=0 or p_file_size>10485760
    or p_file_type not in ('application/pdf','image/png','image/jpeg')
    or nullif(trim(p_file_name),'') is null
    or not public.apdb_storage_team_path_allowed(p_storage_path,'create')
    or not exists (
      select 1 from storage.objects s
      where s.bucket_id='documentos' and s.name=p_storage_path
    )
    or split_part(p_storage_path,'/',4) <> v_doc.equipo_id::text
    or split_part(p_storage_path,'/',6) <> v_doc.player_id::text
    or split_part(p_storage_path,'/',7) <> v_doc.requirement_id::text
  then
    raise exception using errcode='42501',message='archivo no autorizado o inexistente';
  end if;
  select * into v_actor from public.app_users where auth_user_id=auth.uid();
  update public.player_documents set
    uploaded_by=v_actor.display_name,storage_path=p_storage_path,
    file_name=trim(p_file_name),file_type=p_file_type,file_size=p_file_size,
    vencimiento=p_vencimiento,status='cargado',observacion=null,
    reviewed_by=null,reviewed_at=null,updated_at=clock_timestamp()
  where id=v_doc.id;
  insert into public.player_document_events(player_document_id,event_type,actor,detail)
  values(v_doc.id,'cargado',v_actor.display_name,'Documento registrado por delegado');
  return true;
end;
$$;
revoke all on function public.mark_player_document_uploaded(uuid,text,text,text,text,bigint,date) from public,anon,authenticated;
grant execute on function public.mark_player_document_uploaded(uuid,text,text,text,text,bigint,date) to authenticated;

create function public.review_player_document(
  p_document_id uuid,p_status text,p_actor text,p_observacion text default null
) returns boolean
language plpgsql security definer set search_path=public,auth,pg_temp
as $$
declare v_doc public.player_documents%rowtype;
declare v_actor public.app_users%rowtype;
begin
  select * into v_doc from public.player_documents where id=p_document_id for update;
  if not found or p_status not in ('aprobado','observado','rechazado')
    or (p_status <> 'aprobado' and nullif(trim(p_observacion),'') is null)
    or v_doc.storage_path is null or v_doc.status='pendiente'
    or not public.apdb_document_scope_allowed(
      v_doc.organizacion_id,v_doc.torneo_id,v_doc.categoria_id,v_doc.equipo_id,true)
    or not exists(select 1 from storage.objects s
      where s.bucket_id='documentos' and s.name=v_doc.storage_path)
  then
    raise exception using errcode='42501',message='revision documental no autorizada';
  end if;
  select * into v_actor from public.app_users where auth_user_id=auth.uid();
  update public.player_documents set
    status=p_status,observacion=nullif(trim(p_observacion),''),
    reviewed_by=v_actor.display_name,reviewed_at=clock_timestamp(),
    updated_at=clock_timestamp()
  where id=v_doc.id;
  insert into public.player_document_events(player_document_id,event_type,actor,detail)
  values(v_doc.id,p_status,v_actor.display_name,coalesce(nullif(trim(p_observacion),''),'Aprobado por Asociación'));
  return true;
end;
$$;
revoke all on function public.review_player_document(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.review_player_document(uuid,text,text,text) to authenticated;

create function public.mark_team_document_uploaded(
  p_document_id uuid,p_uploaded_by text,p_storage_path text,
  p_file_name text,p_file_type text,p_file_size bigint,p_vencimiento date default null
) returns boolean
language plpgsql security definer set search_path=public,auth,pg_temp
as $$
declare v_doc public.team_documents%rowtype;
declare v_actor public.app_users%rowtype;
begin
  select * into v_doc from public.team_documents where id=p_document_id for update;
  if not found or not public.apdb_document_scope_allowed(
    v_doc.organizacion_id,v_doc.torneo_id,v_doc.categoria_id,v_doc.equipo_id,false)
    or p_file_size is null or p_file_size<=0 or p_file_size>10485760
    or p_file_type not in ('application/pdf','image/png','image/jpeg')
    or nullif(trim(p_file_name),'') is null
    or not public.apdb_storage_team_path_allowed(p_storage_path,'create')
    or not exists(select 1 from storage.objects s
      where s.bucket_id='documentos' and s.name=p_storage_path)
    or split_part(p_storage_path,'/',4) <> v_doc.equipo_id::text
    or split_part(p_storage_path,'/',5)<>v_doc.requirement_id::text
  then
    raise exception using errcode='42501',message='archivo de equipo no autorizado';
  end if;
  select * into v_actor from public.app_users where auth_user_id=auth.uid();
  update public.team_documents set
    uploaded_by=v_actor.display_name,storage_path=p_storage_path,
    file_name=trim(p_file_name),file_type=p_file_type,file_size=p_file_size,
    vencimiento=p_vencimiento,status='cargado',observacion=null,
    reviewed_by=null,reviewed_at=null,updated_at=clock_timestamp()
  where id=v_doc.id;
  insert into public.document_events(team_document_id,event_type,actor,detail)
  values(v_doc.id,'cargado',v_actor.display_name,'Documento de equipo cargado');
  return true;
end;
$$;
revoke all on function public.mark_team_document_uploaded(uuid,text,text,text,text,bigint,date) from public,anon,authenticated;
grant execute on function public.mark_team_document_uploaded(uuid,text,text,text,text,bigint,date) to authenticated;

create function public.review_team_document(
  p_document_id uuid,p_status text,p_actor text,p_observacion text default null
) returns boolean
language plpgsql security definer set search_path=public,auth,pg_temp
as $$
declare v_doc public.team_documents%rowtype;
declare v_actor public.app_users%rowtype;
begin
  select * into v_doc from public.team_documents where id=p_document_id for update;
  if not found or p_status not in ('aprobado','observado','rechazado')
    or (p_status<>'aprobado' and nullif(trim(p_observacion),'') is null)
    or v_doc.storage_path is null or v_doc.status='pendiente'
    or not public.apdb_document_scope_allowed(
      v_doc.organizacion_id,v_doc.torneo_id,v_doc.categoria_id,v_doc.equipo_id,true)
    or not exists(select 1 from storage.objects s
      where s.bucket_id='documentos' and s.name=v_doc.storage_path)
  then
    raise exception using errcode='42501',message='revision de equipo no autorizada';
  end if;
  select * into v_actor from public.app_users where auth_user_id=auth.uid();
  update public.team_documents set
    status=p_status,observacion=nullif(trim(p_observacion),''),
    reviewed_by=v_actor.display_name,reviewed_at=clock_timestamp(),updated_at=clock_timestamp()
  where id=v_doc.id;
  insert into public.document_events(team_document_id,event_type,actor,detail)
  values(v_doc.id,p_status,v_actor.display_name,coalesce(nullif(trim(p_observacion),''),'Aprobado por Asociación'));
  return true;
end;
$$;
revoke all on function public.review_team_document(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.review_team_document(uuid,text,text,text) to authenticated;


-- Read-only views used by the official application must not reveal another
-- organization or another delegated team. A role title alone is insufficient.
create or replace function public.apdb_document_view_allowed(
  p_org uuid,p_tournament uuid,p_category uuid,p_team uuid
) returns boolean
language sql stable security definer
set search_path=public,auth,pg_temp
as $$
  select exists (
    select 1 from public.app_users au
    join public.app_user_permissions p on p.user_id=au.id
    join public.equipos e on e.id=p_team and e.categoria_id=p_category
    join public.categorias c on c.id=e.categoria_id and c.torneo_id=p_tournament
    join public.torneos t on t.id=c.torneo_id and t.organizacion_id=p_org
    where au.auth_user_id=auth.uid() and au.active
      and au.organizacion_id=p_org and p.organizacion_id=p_org
      and p.torneo_id=p_tournament and p.categoria_id=p_category
      and (p.equipo_id is null or p.equipo_id=p_team)
      and (
        (au.role in ('asociacion','admin_general') and p.can_review_documents)
        or (au.role='delegado' and p.equipo_id=p_team
            and p.can_view and p.can_load_documents)
      )
  );
$$;
revoke all on function public.apdb_document_view_allowed(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.apdb_document_view_allowed(uuid,uuid,uuid,uuid) to authenticated;

-- Team view already invokes apdb_document_access_allowed; tighten that helper
-- without altering its result-column contract.
create or replace function public.apdb_document_access_allowed(
  p_organizacion_id uuid,p_categoria_id uuid,p_equipo_id uuid
) returns boolean
language sql stable security definer
set search_path=public,auth,pg_temp
as $$
  select exists (
    select 1 from public.categorias c
    join public.torneos t on t.id=c.torneo_id and t.organizacion_id=p_organizacion_id
    where c.id=p_categoria_id
      and public.apdb_document_view_allowed(p_organizacion_id,t.id,c.id,p_equipo_id)
  );
$$;
revoke all on function public.apdb_document_access_allowed(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.apdb_document_access_allowed(uuid,uuid,uuid) to authenticated;

create or replace view public.v_player_documents_admin
with (security_barrier=true)
as
select pd.id,pd.player_id,
  tp.nombre as jugador_nombre,tp.dni as jugador_dni,tp.dorsal as jugador_dorsal,
  tp.baja_solicitada,tp.baja_motivo,tp.baja_solicitada_por,tp.baja_solicitada_en,
  pd.requirement_id,dr.nombre as requirement_nombre,
  pd.organizacion_id,o.nombre as organizacion_nombre,
  pd.torneo_id,t.nombre as torneo_nombre,
  pd.categoria_id,c.nombre as categoria_nombre,
  pd.equipo_id,pd.equipo_nombre,pd.uploaded_by,pd.storage_path,
  pd.file_name,pd.file_type,pd.file_size,pd.status,pd.vencimiento,
  pd.observacion,pd.reviewed_by,pd.reviewed_at,pd.created_at,pd.updated_at
from public.player_documents pd
join public.team_players tp on tp.id=pd.player_id
left join public.document_requirements dr on dr.id=pd.requirement_id
left join public.organizaciones o on o.id=pd.organizacion_id
left join public.torneos t on t.id=pd.torneo_id
left join public.categorias c on c.id=pd.categoria_id
where tp.activo
  and public.apdb_document_view_allowed(
    pd.organizacion_id,pd.torneo_id,pd.categoria_id,pd.equipo_id
  );
revoke all on public.v_player_documents_admin from public,anon,authenticated;
grant select on public.v_player_documents_admin to authenticated;


-- Allow several immutable, individually auditable files for requirements
-- configured with allows_multiple_files=true (for example LDBF or insurance).
create function public.add_team_document_file(
  p_document_id uuid,p_uploaded_by text,p_storage_path text,
  p_file_name text,p_file_type text,p_file_size bigint
) returns uuid
language plpgsql security definer set search_path=public,auth,pg_temp
as $$
declare v_doc public.team_documents%rowtype;
declare v_actor public.app_users%rowtype;
declare v_file_id uuid;
begin
  select * into v_doc from public.team_documents where id=p_document_id for update;
  if not found or not public.apdb_document_scope_allowed(
    v_doc.organizacion_id,v_doc.torneo_id,v_doc.categoria_id,v_doc.equipo_id,false)
    or not exists(select 1 from public.document_requirements r
      where r.id=v_doc.requirement_id and r.allows_multiple_files)
    or p_file_type not in ('application/pdf','image/png','image/jpeg')
    or p_file_size is null or p_file_size<=0 or p_file_size>10485760
    or nullif(trim(p_file_name),'') is null
    or not public.apdb_storage_team_path_allowed(p_storage_path,'create')
    or split_part(p_storage_path,'/',4) <> v_doc.equipo_id::text
    or split_part(p_storage_path,'/',5)<>v_doc.requirement_id::text
    or not exists(select 1 from storage.objects s
      where s.bucket_id='documentos' and s.name=p_storage_path)
  then
    raise exception using errcode='42501',message='archivo multiple fuera de alcance';
  end if;
  if exists(select 1 from public.document_files df
            where df.team_document_id=v_doc.id and df.storage_path=p_storage_path) then
    raise exception using errcode='23505',message='archivo ya incorporado';
  end if;
  select * into v_actor from public.app_users where auth_user_id=auth.uid() and active;
  insert into public.document_files(
    team_document_id,uploaded_by,storage_path,file_name,file_type,file_size
  ) values(
    v_doc.id,v_actor.display_name,p_storage_path,trim(p_file_name),p_file_type,p_file_size
  ) returning id into v_file_id;
  update public.team_documents set
    uploaded_by=v_actor.display_name,
    storage_path=coalesce(storage_path,p_storage_path),
    file_name=coalesce(file_name,trim(p_file_name)),
    file_type=coalesce(file_type,p_file_type),
    file_size=coalesce(file_size,p_file_size),
    status='cargado',observacion=null,reviewed_by=null,reviewed_at=null,
    updated_at=clock_timestamp()
  where id=v_doc.id;
  insert into public.document_events(team_document_id,event_type,actor,detail)
  values(v_doc.id,'archivo_agregado',v_actor.display_name,'Archivo multiple registrado');
  return v_file_id;
end;
$$;
revoke all on function public.add_team_document_file(uuid,text,text,text,text,bigint)
  from public,anon,authenticated;
grant execute on function public.add_team_document_file(uuid,text,text,text,text,bigint)
  to authenticated;

-- Official delegate UI reads active requirement names and its own roster.
-- The isolated baseline intentionally had RLS but no authenticated SELECT,
-- so otherwise its document panel silently falls back to hardcoded names.
revoke all on public.document_requirements from anon;
grant select on public.document_requirements to authenticated;
drop policy if exists apdb_document_requirements_scoped_select on public.document_requirements;
create policy apdb_document_requirements_scoped_select on public.document_requirements
for select to authenticated using (
  activo and exists (
    select 1 from public.equipos e
    join public.categorias c on c.id = e.categoria_id
    join public.torneos t on t.id = c.torneo_id
    where t.id = document_requirements.torneo_id
      and t.organizacion_id = document_requirements.organizacion_id
      and (document_requirements.categoria_id is null
        or document_requirements.categoria_id = c.id)
      and public.apdb_document_view_allowed(
        t.organizacion_id, t.id, c.id, e.id
      )
  )
);
revoke all on public.team_players from anon;
grant select on public.team_players to authenticated;
drop policy if exists apdb_team_players_scoped_select on public.team_players;
create policy apdb_team_players_scoped_select on public.team_players
for select to authenticated using (
  public.apdb_document_view_allowed(
    organizacion_id,torneo_id,categoria_id,equipo_id
  )
);

-- Source candidate 20261126000000 (secure document RPC)
-- APdB 2027 · Draft patch for isolated database acceptance ONLY.
-- Do not run against persistent staging until the full backend/frontend release passes
-- negative tests and receives separate authorization.
-- Expected PostgreSQL >= 15. Uses the existing view's row type, with a SECURITY DEFINER
-- RPC that reads base tables and applies the existing per-team authorization predicate.
BEGIN;

CREATE OR REPLACE FUNCTION public.apdb_list_team_documents(p_categoria_id uuid)
RETURNS SETOF public.v_team_documents_admin
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $fn$
BEGIN
  -- Explicit deny if no verified identity or invalid category.
  IF auth.uid() IS NULL OR p_categoria_id IS NULL THEN
    RAISE EXCEPTION 'APDB_DOCUMENT_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT td.id,
         td.requirement_id,
         dr.nombre AS requirement_nombre,
         td.organizacion_id,
         org.nombre AS organizacion_nombre,
         td.torneo_id,
         t.nombre AS torneo_nombre,
         td.categoria_id,
         c.nombre AS categoria_nombre,
         td.equipo_id,
         td.equipo_nombre,
         td.uploaded_by,
         td.storage_path,
         td.file_name,
         td.file_type,
         td.file_size,
         td.status,
         td.vencimiento,
         td.observacion,
         td.reviewed_by,
         td.reviewed_at,
         td.created_at,
         td.updated_at
  FROM public.team_documents td
  LEFT JOIN public.document_requirements dr ON dr.id = td.requirement_id
  LEFT JOIN public.organizaciones org ON org.id = td.organizacion_id
  LEFT JOIN public.torneos t ON t.id = td.torneo_id
  LEFT JOIN public.categorias c ON c.id = td.categoria_id
  WHERE td.categoria_id = p_categoria_id
    AND public.apdb_document_access_allowed(td.organizacion_id, td.categoria_id, td.equipo_id);
END;
$fn$;

-- Player documents: must not be exposed through the legacy unscoped view.
-- This RPC returns only active players' documents within an authorized team.
CREATE OR REPLACE FUNCTION public.apdb_list_player_documents(p_categoria_id uuid)
RETURNS SETOF public.v_player_documents_admin
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $fn$
BEGIN
  IF auth.uid() IS NULL OR p_categoria_id IS NULL THEN
    RAISE EXCEPTION 'APDB_DOCUMENT_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT pd.id,
         pd.player_id,
         tp.nombre AS jugador_nombre,
         tp.dni AS jugador_dni,
         tp.dorsal AS jugador_dorsal,
         tp.baja_solicitada,
         tp.baja_motivo,
         tp.baja_solicitada_por,
         tp.baja_solicitada_en,
         pd.requirement_id,
         dr.nombre AS requirement_nombre,
         pd.organizacion_id,
         org.nombre AS organizacion_nombre,
         pd.torneo_id,
         t.nombre AS torneo_nombre,
         pd.categoria_id,
         c.nombre AS categoria_nombre,
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
  FROM public.player_documents pd
  JOIN public.team_players tp ON tp.id = pd.player_id
  LEFT JOIN public.document_requirements dr ON dr.id = pd.requirement_id
  LEFT JOIN public.organizaciones org ON org.id = pd.organizacion_id
  LEFT JOIN public.torneos t ON t.id = pd.torneo_id
  LEFT JOIN public.categorias c ON c.id = pd.categoria_id
  WHERE pd.categoria_id = p_categoria_id
    AND tp.activo = true
    AND tp.equipo_id = pd.equipo_id
    AND tp.categoria_id = pd.categoria_id
    AND public.apdb_document_access_allowed(pd.organizacion_id, pd.categoria_id, pd.equipo_id);
END;
$fn$;

REVOKE ALL ON FUNCTION public.apdb_list_player_documents(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apdb_list_player_documents(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.apdb_list_player_documents(uuid) TO authenticated;

-- Do not expose either owner-privileged document view to API clients.
ALTER VIEW public.v_player_documents_admin SET (security_invoker = true);
REVOKE ALL ON TABLE public.v_player_documents_admin FROM PUBLIC;
REVOKE ALL ON TABLE public.v_player_documents_admin FROM anon;
REVOKE ALL ON TABLE public.v_player_documents_admin FROM authenticated;

REVOKE ALL ON FUNCTION public.apdb_list_team_documents(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apdb_list_team_documents(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.apdb_list_team_documents(uuid) TO authenticated;

-- Replace the default owner-privileged behavior and prevent API clients
-- from bypassing the category-bound RPC by selecting the view directly.
ALTER VIEW public.v_team_documents_admin SET (security_invoker = true);
REVOKE ALL ON TABLE public.v_team_documents_admin FROM PUBLIC;
REVOKE ALL ON TABLE public.v_team_documents_admin FROM anon;
REVOKE ALL ON TABLE public.v_team_documents_admin FROM authenticated;

-- IMPORTANT: original 20261124000000 Storage migration intentionally omitted.
-- Host Storage policies and apdb_storage_team_path_allowed are preserved byte-for-byte.
DO $postflight$
DECLARE v_count int;
BEGIN
  IF to_regclass('public.apdb_player_eligibility_events') IS NULL
     OR to_regprocedure('public.apdb_set_player_eligibility(uuid,text,text)') IS NULL
     OR to_regprocedure('public.apdb_list_player_documents(uuid)') IS NULL
     OR to_regprocedure('public.apdb_list_team_documents(uuid)') IS NULL THEN
    RAISE EXCEPTION 'APDB_DIFFERENTIAL_POSTFLIGHT_MISSING_RPC';
  END IF;
  SELECT count(*) INTO v_count FROM pg_policies
  WHERE schemaname='storage' AND tablename='objects'
    AND policyname IN ('apdb_documents_select','apdb_documents_insert','apdb_documents_update','apdb_documents_delete')
    AND (coalesce(qual,'') || coalesce(with_check,'')) LIKE '%apdb_storage_team_path_allowed%';
  IF v_count<>4 THEN RAISE EXCEPTION 'APDB_STORAGE_POLICY_CHANGED'; END IF;
  IF has_table_privilege('authenticated','public.v_team_documents_admin','SELECT')
    OR has_table_privilege('authenticated','public.v_player_documents_admin','SELECT')
    OR has_table_privilege('anon','public.v_team_documents_admin','SELECT')
    OR has_table_privilege('anon','public.v_player_documents_admin','SELECT') THEN
    RAISE EXCEPTION 'APDB_DOCUMENT_VIEWS_STILL_EXPOSED';
  END IF;
END;
$postflight$;
COMMIT;
