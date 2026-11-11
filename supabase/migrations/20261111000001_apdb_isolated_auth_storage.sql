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

commit;
