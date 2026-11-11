-- Isolated-only hardening. Requires Supabase Auth and Storage services.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png']::text[])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.apdb_storage_org_allowed(p_organization_id uuid)
returns boolean language sql stable security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.app_users au
    where au.auth_user_id = auth.uid()
      and au.organizacion_id = p_organization_id
      and au.active
  );
$$;
revoke all on function public.apdb_storage_org_allowed(uuid) from public, anon;
grant execute on function public.apdb_storage_org_allowed(uuid) to authenticated;

drop policy if exists apdb_documents_insert on storage.objects;
create policy apdb_documents_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'documentos' and public.apdb_storage_org_allowed(split_part(name, '/', 1)::uuid));

drop policy if exists apdb_documents_select on storage.objects;
create policy apdb_documents_select on storage.objects
for select to authenticated
using (bucket_id = 'documentos' and public.apdb_storage_org_allowed(split_part(name, '/', 1)::uuid));

drop policy if exists apdb_documents_update on storage.objects;
create policy apdb_documents_update on storage.objects
for update to authenticated
using (bucket_id = 'documentos' and public.apdb_storage_org_allowed(split_part(name, '/', 1)::uuid))
with check (bucket_id = 'documentos' and public.apdb_storage_org_allowed(split_part(name, '/', 1)::uuid));

drop policy if exists apdb_documents_delete on storage.objects;
create policy apdb_documents_delete on storage.objects
for delete to authenticated
using (bucket_id = 'documentos' and public.apdb_storage_org_allowed(split_part(name, '/', 1)::uuid));

create or replace function public.apdb_save_result(
  p_match_id uuid, p_home_score integer, p_away_score integer
)
returns public.partidos language plpgsql security definer
set search_path = public, auth as $$
declare actor public.app_users; target public.partidos; allowed boolean;
begin
  select * into actor from public.app_users
    where auth_user_id = auth.uid() and active for update;
  if actor.id is null then raise exception 'APDB_AUTH_REQUIRED'; end if;
  select * into target from public.partidos where id = p_match_id for update;
  if target.id is null then raise exception 'APDB_MATCH_NOT_FOUND'; end if;
  select (actor.role in ('asociacion', 'admin_general') or exists (
    select 1 from public.app_user_permissions p
    where p.user_id = actor.id and p.categoria_id = target.categoria_id
      and p.can_load_results
  )) into allowed;
  if not allowed then raise exception 'APDB_RESULT_FORBIDDEN'; end if;
  if target.estado_resultado <> 'pendiente' then raise exception 'APDB_RESULT_ALREADY_SET'; end if;
  update public.partidos set puntos_local = p_home_score,
    puntos_visitante = p_away_score, estado_resultado = 'jugado',
    cargado_por = actor.id::text, cargado_en = now(), updated_at = now()
    where id = p_match_id returning * into target;
  return target;
end;
$$;
revoke all on function public.apdb_save_result(uuid, integer, integer) from public, anon;
grant execute on function public.apdb_save_result(uuid, integer, integer) to authenticated;

create or replace function public.apdb_association_update_result(
  p_match_id uuid, p_home_score integer, p_away_score integer,
  p_result_state text, p_action text
)
returns public.partidos language plpgsql security definer
set search_path = public, auth as $$
declare actor public.app_users; target public.partidos; updated public.partidos;
begin
  select * into actor from public.app_users
    where auth_user_id = auth.uid() and active
    and role in ('asociacion', 'admin_general') for update;
  if actor.id is null then raise exception 'APDB_ASSOCIATION_REQUIRED'; end if;
  select p.* into target from public.partidos p
    join public.categorias c on c.id = p.categoria_id
    join public.torneos t on t.id = c.torneo_id
    where p.id = p_match_id and t.organizacion_id = actor.organizacion_id
    for update;
  if target.id is null then raise exception 'APDB_MATCH_FORBIDDEN'; end if;
  if p_result_state = 'jugado' and (p_home_score is null or p_away_score is null or p_home_score = p_away_score) then
    raise exception 'APDB_INVALID_SPORT_RESULT';
  end if;
  if p_result_state = 'administrativo_sin_puntos' and (p_home_score <> 0 or p_away_score <> 0) then
    raise exception 'APDB_INVALID_ADMIN_RESULT';
  end if;
  if p_result_state = 'resolucion_local' and (p_home_score <> 20 or p_away_score <> 0) then
    raise exception 'APDB_INVALID_ADMIN_RESULT';
  end if;
  if p_result_state = 'resolucion_visitante' and (p_home_score <> 0 or p_away_score <> 20) then
    raise exception 'APDB_INVALID_ADMIN_RESULT';
  end if;
  update public.partidos set puntos_local = p_home_score,
    puntos_visitante = p_away_score, estado_resultado = p_result_state,
    cargado_por = actor.id::text, cargado_en = now(), updated_at = now()
    where id = p_match_id returning * into updated;
  insert into public.result_change_logs
    (partido_id, categoria_id, torneo_id, categoria_nombre, jornada, fecha, local, visitante,
     puntos_local_anterior, puntos_visitante_anterior, estado_resultado_anterior,
     cargado_por_anterior, cargado_en_anterior, puntos_local_nuevo, puntos_visitante_nuevo,
     estado_resultado_nuevo, cargado_por_nuevo, cargado_en_nuevo, accion, actor, origen, detalle)
  select target.id, target.categoria_id, c.torneo_id, c.nombre, target.jornada, target.fecha,
    target.local, target.visitante, target.puntos_local, target.puntos_visitante,
    target.estado_resultado, target.cargado_por, target.cargado_en, updated.puntos_local,
    updated.puntos_visitante, updated.estado_resultado, updated.cargado_por, updated.cargado_en,
    coalesce(nullif(p_action, ''), 'asociacion_update'), actor.id::text, 'apdb_association_rpc', '{}'::jsonb
  from public.categorias c where c.id = target.categoria_id;
  return updated;
end;
$$;
revoke all on function public.apdb_association_update_result(uuid, integer, integer, text, text) from public, anon;
grant execute on function public.apdb_association_update_result(uuid, integer, integer, text, text) to authenticated;

commit;
