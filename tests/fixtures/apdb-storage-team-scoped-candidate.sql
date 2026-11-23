-- DISPOSABLE SUPABASE ONLY. Not a production migration.
-- Candidate to replace storage policies after real JWT/browser regression tests.
-- Expected application path: <org_slug>/<season>/<category_slug>/<team_uuid>/<requirement>/file
-- Player path: <org_slug>/<season>/<category_slug>/<team_uuid>/jugadores/<player_uuid>/<requirement>/file
begin;

create or replace function public.apdb_storage_team_path_allowed(p_path text, p_operation text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $fn$
declare
  segments text[];
  team_id uuid;
begin
  if p_operation not in ('read', 'create', 'update', 'delete') then return false; end if;
  segments := string_to_array(p_path, '/');
  if coalesce(array_length(segments, 1), 0) < 6 then return false; end if;
  if nullif(segments[1], '') is null or nullif(segments[2], '') is null
     or nullif(segments[3], '') is null or nullif(segments[6], '') is null then
    return false;
  end if;
  if segments[4] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  team_id := segments[4]::uuid;
  return exists (
    select 1
    from public.organizaciones org
    join public.torneos t on t.organizacion_id = org.id and t.temporada = segments[2]
    join public.categorias c on c.torneo_id = t.id
    join public.equipos e on e.id = team_id and e.categoria_id = c.id
    join public.app_users au on au.organizacion_id = org.id and au.auth_user_id = auth.uid() and au.active
    where org.slug = segments[1]
      and trim(both '-' from regexp_replace(
        translate(lower(c.nombre), 'áéíóúüñ', 'aeiouun'), '[^a-z0-9]+', '-', 'g'
      )) = segments[3]
      and (
        au.role in ('asociacion', 'admin_general')
        or (
          au.role = 'delegado'
          and p_operation in ('read', 'create')
          and exists (
            select 1 from public.app_user_permissions perm
            where perm.user_id = au.id
              and perm.organizacion_id = org.id
              and perm.categoria_id = c.id
              and perm.equipo_id = e.id
              and perm.can_view and perm.can_load_documents
          )
        )
      )
  );
end;
$fn$;

revoke all on function public.apdb_storage_team_path_allowed(text, text)
  from public, anon, authenticated;
grant execute on function public.apdb_storage_team_path_allowed(text, text)
  to authenticated;

drop policy if exists apdb_documents_insert on storage.objects;
create policy apdb_documents_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documentos'
    and public.apdb_storage_team_path_allowed(name, 'create')
  );

drop policy if exists apdb_documents_select on storage.objects;
create policy apdb_documents_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documentos'
    and public.apdb_storage_team_path_allowed(name, 'read')
  );

drop policy if exists apdb_documents_update on storage.objects;
create policy apdb_documents_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documentos'
    and public.apdb_storage_team_path_allowed(name, 'update')
  )
  with check (
    bucket_id = 'documentos'
    and public.apdb_storage_team_path_allowed(name, 'update')
  );

drop policy if exists apdb_documents_delete on storage.objects;
create policy apdb_documents_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documentos'
    and public.apdb_storage_team_path_allowed(name, 'delete')
  );

commit;
