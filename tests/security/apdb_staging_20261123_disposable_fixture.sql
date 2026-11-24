-- ONLY for Docker disposable Supabase CI to imitate the hosted staging baseline.
-- Contains function definitions (not private records) captured read-only 2026-11-23.
BEGIN;
CREATE OR REPLACE FUNCTION public.apdb_document_access_allowed(p_organizacion_id uuid, p_categoria_id uuid, p_equipo_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select exists (
    select 1
    from public.app_users au
    where au.auth_user_id = auth.uid()
      and au.active
      and (
        (
          au.role in ('asociacion', 'admin_general')
          and au.organizacion_id = p_organizacion_id
        )
        or exists (
          select 1
          from public.app_user_permissions aup
          where aup.user_id = au.id
            and au.role = 'delegado'
            and aup.organizacion_id = p_organizacion_id
            and aup.categoria_id = p_categoria_id
            and aup.equipo_id = p_equipo_id
            and aup.can_view
            and aup.can_load_documents
        )
      )
      and exists (
        select 1
        from public.categorias c
        join public.torneos t on t.id = c.torneo_id
        where c.id = p_categoria_id
          and t.organizacion_id = p_organizacion_id
      )
      and exists (
        select 1
        from public.equipos e
        where e.id = p_equipo_id
          and e.categoria_id = p_categoria_id
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.apdb_storage_team_path_allowed(p_path text, p_operation text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
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
$function$;
DROP POLICY IF EXISTS apdb_documents_select ON storage.objects;
DROP POLICY IF EXISTS apdb_documents_insert ON storage.objects;
DROP POLICY IF EXISTS apdb_documents_update ON storage.objects;
DROP POLICY IF EXISTS apdb_documents_delete ON storage.objects;
CREATE POLICY apdb_documents_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='documentos' AND public.apdb_storage_team_path_allowed(name,'read'));
CREATE POLICY apdb_documents_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='documentos' AND public.apdb_storage_team_path_allowed(name,'create'));
CREATE POLICY apdb_documents_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id='documentos' AND public.apdb_storage_team_path_allowed(name,'update'))
  WITH CHECK (bucket_id='documentos' AND public.apdb_storage_team_path_allowed(name,'update'));
CREATE POLICY apdb_documents_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='documentos' AND public.apdb_storage_team_path_allowed(name,'delete'));
INSERT INTO supabase_migrations.schema_migrations(version,name)
 VALUES ('20261123163609','synthetic_staging_baseline_marker_for_ci')
 ON CONFLICT (version) DO NOTHING;
COMMIT;
