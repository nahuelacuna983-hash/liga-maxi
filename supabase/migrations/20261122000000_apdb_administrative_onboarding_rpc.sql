-- APdB administrative onboarding. Prepared for isolated review; not applied remotely.
begin;

create or replace function public.apdb_ensure_tournament_category_teams(
  p_tournament_name text,
  p_season text,
  p_category_name text,
  p_team_names jsonb
)
returns table (
  tournament_id uuid,
  category_id uuid,
  team_ids uuid[]
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user public.app_users%rowtype;
  v_tournament public.torneos%rowtype;
  v_category public.categorias%rowtype;
  v_team_name text;
  v_team_id uuid;
  v_team_ids uuid[] := '{}';
begin
  perform pg_advisory_xact_lock(hashtextextended(coalesce(p_tournament_name, '') || E'|' || coalesce(p_season, '') || E'|' || coalesce(p_category_name, ''), 2027));
  select u.* into v_user
  from public.app_users u
  where u.auth_user_id = auth.uid()
    and u.active
    and u.role in ('admin_general', 'asociacion')
    and exists (
      select 1 from public.app_user_permissions p
      where p.user_id = u.id
        and p.organizacion_id = u.organizacion_id
        and p.can_manage_tournaments
        and p.can_view
    )
  limit 1;

  if v_user.id is null then
    raise exception using errcode = '42501', message = 'identidad sin permiso para administrar torneos';
  end if;
  if nullif(trim(p_tournament_name), '') is null or nullif(trim(p_category_name), '') is null then
    raise exception using errcode = '22023', message = 'torneo y categoria son obligatorios';
  end if;
  if jsonb_typeof(p_team_names) <> 'array' or jsonb_array_length(p_team_names) < 2 then
    raise exception using errcode = '22023', message = 'se requieren al menos dos equipos';
  end if;

  select t.* into v_tournament
  from public.torneos t
  where t.organizacion_id = v_user.organizacion_id
    and t.nombre = trim(p_tournament_name)
    and t.temporada = trim(p_season)
  for update;

  if v_tournament.id is null then
    insert into public.torneos (organizacion_id, nombre, temporada, estado)
    values (v_user.organizacion_id, trim(p_tournament_name), trim(p_season), 'borrador')
    returning * into v_tournament;
  end if;

  select c.* into v_category
  from public.categorias c
  where c.torneo_id = v_tournament.id
    and c.nombre = trim(p_category_name)
  for update;

  if v_category.id is null then
    insert into public.categorias (torneo_id, nombre, estado)
    values (v_tournament.id, trim(p_category_name), 'borrador')
    returning * into v_category;
  end if;

  for v_team_name in select distinct trim(value) from jsonb_array_elements_text(p_team_names) value
  loop
    if v_team_name = '' then continue; end if;
    select e.id into v_team_id
    from public.equipos e
    where e.categoria_id = v_category.id and e.nombre = v_team_name
    for update;
    if v_team_id is null then
      insert into public.equipos (categoria_id, nombre, activo)
      values (v_category.id, v_team_name, true)
      returning id into v_team_id;
    end if;
    v_team_ids := array_append(v_team_ids, v_team_id);
    v_team_id := null;
  end loop;

  if coalesce(array_length(v_team_ids, 1), 0) < 2 then
    raise exception using errcode = '22023', message = 'los equipos validos son insuficientes';
  end if;
  return query select v_tournament.id, v_category.id, v_team_ids;
end;
$$;

create or replace function public.apdb_set_delegate_scope(
  p_target_auth_user_id uuid,
  p_tournament_id uuid,
  p_category_id uuid,
  p_team_id uuid,
  p_can_load_results boolean default true,
  p_can_load_documents boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_actor public.app_users%rowtype;
  v_target public.app_users%rowtype;
  v_permission_id uuid;
begin
  select u.* into v_actor from public.app_users u
  where u.auth_user_id = auth.uid() and u.active and u.role in ('admin_general', 'asociacion')
    and exists (select 1 from public.app_user_permissions p where p.user_id = u.id and p.organizacion_id = u.organizacion_id and p.can_manage_users);
  if v_actor.id is null then raise exception using errcode = '42501', message = 'identidad sin permiso para administrar usuarios'; end if;
  select u.* into v_target from public.app_users u where u.auth_user_id = p_target_auth_user_id and u.active;
  if v_target.id is null or v_target.role <> 'delegado' or v_target.organizacion_id <> v_actor.organizacion_id then raise exception using errcode = '42501', message = 'usuario delegado fuera de la organizacion'; end if;
  if not exists (select 1 from public.torneos t join public.categorias c on c.torneo_id = t.id join public.equipos e on e.categoria_id = c.id where t.id = p_tournament_id and c.id = p_category_id and e.id = p_team_id and t.organizacion_id = v_actor.organizacion_id) then raise exception using errcode = '42501', message = 'alcance fuera de la organizacion'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_target.id::text || E'|' || p_tournament_id::text || E'|' || p_category_id::text || E'|' || p_team_id::text, 2027));
  select p.id into v_permission_id
  from public.app_user_permissions p
  where p.user_id = v_target.id and p.torneo_id = p_tournament_id and p.categoria_id = p_category_id and p.equipo_id = p_team_id
  for update;
  if v_permission_id is null then
    insert into public.app_user_permissions (user_id, organizacion_id, torneo_id, categoria_id, equipo_id, equipo_nombre, can_view, can_load_results, can_load_documents)
    select v_target.id, v_actor.organizacion_id, p_tournament_id, p_category_id, e.id, e.nombre, true, p_can_load_results, p_can_load_documents
    from public.equipos e where e.id = p_team_id returning id into v_permission_id;
  else
    update public.app_user_permissions set can_view = true, can_load_results = p_can_load_results, can_load_documents = p_can_load_documents where id = v_permission_id;
  end if;
  return v_permission_id;
end;
$$;

create or replace function public.apdb_revoke_delegate_scope(p_permission_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare v_actor public.app_users%rowtype; v_org uuid; begin
  select u.* into v_actor from public.app_users u where u.auth_user_id = auth.uid() and u.active and u.role in ('admin_general','asociacion') and exists (select 1 from public.app_user_permissions p where p.user_id = u.id and p.organizacion_id = u.organizacion_id and p.can_manage_users);
  if v_actor.id is null then raise exception using errcode = '42501', message = 'identidad sin permiso para revocar usuarios'; end if;
  select organizacion_id into v_org from public.app_user_permissions where id = p_permission_id;
  if v_org is distinct from v_actor.organizacion_id then raise exception using errcode = '42501', message = 'permiso fuera de la organizacion'; end if;
  delete from public.app_user_permissions where id = p_permission_id;
  return found;
end;
$$;

revoke all on function public.apdb_ensure_tournament_category_teams(text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.apdb_set_delegate_scope(uuid,uuid,uuid,uuid,boolean,boolean) from public, anon, authenticated;
revoke all on function public.apdb_revoke_delegate_scope(uuid) from public, anon, authenticated;
grant execute on function public.apdb_ensure_tournament_category_teams(text,text,text,jsonb) to authenticated;
grant execute on function public.apdb_set_delegate_scope(uuid,uuid,uuid,uuid,boolean,boolean) to authenticated;
grant execute on function public.apdb_revoke_delegate_scope(uuid) to authenticated;
commit;
