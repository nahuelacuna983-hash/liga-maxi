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
  created_at timestamptz not null default now()
);
create index apdb_player_eligibility_events_latest
  on public.apdb_player_eligibility_events(player_id, created_at desc, id desc);

alter table public.apdb_player_eligibility_events enable row level security;
revoke all on table public.apdb_player_eligibility_events from public, anon, authenticated;

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
        and r.categoria_id = v_player.categoria_id
    ) then
      raise exception using errcode = '23514', message = 'requisitos institucionales aun no configurados';
    end if;
    if exists (
      select 1
      from public.document_requirements r
      where r.activo and r.obligatorio
        and r.organizacion_id = v_player.organizacion_id
        and r.torneo_id = v_player.torneo_id
        and r.categoria_id = v_player.categoria_id
        and (
          (r.scope = 'player' and not exists (
            select 1 from public.player_documents d
             where d.player_id = v_player.id and d.requirement_id = r.id
               and d.status = 'aprobado'
               and (not r.requiere_vencimiento or d.vencimiento >= current_date)
          ))
          or
          (r.scope = 'team' and not exists (
            select 1 from public.team_documents d
             where d.equipo_id = v_player.equipo_id and d.requirement_id = r.id
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
commit;
