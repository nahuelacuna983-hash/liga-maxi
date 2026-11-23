-- APdB 2027. Private-document policies for the official path layout.
-- Applied only to disposable Supabase until the release/security gate.
-- These replace the old organization-only policies, which were too broad
-- and cast a path slug (e.g. "apdb") to uuid.
begin;

create or replace function public.apdb_storage_path_allowed(p_name text, p_action text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $apdb_path$
declare
  v_user public.app_users%rowtype;
  v_org uuid;
  v_tournament uuid;
  v_category uuid;
  v_team uuid;
  v_player uuid;
  v_requirement uuid;
  v_scope text;
  v_authorized boolean := false;
begin
  if auth.uid() is null or p_action not in ('read','upload') then return false; end if;
  -- Do not permit unstructured paths or path traversal.
  if p_name is null or p_name like '%..%' or p_name like '%//%' then return false; end if;
  if split_part(p_name,'/',1) = '' or split_part(p_name,'/',2) = ''
     or split_part(p_name,'/',3) = '' or split_part(p_name,'/',4) = '' then return false; end if;
  select * into v_user from public.app_users
  where auth_user_id = auth.uid() and active;
  if not found then return false; end if;
  -- Resolve tenant, season, category and club by *database membership*,
  -- never by a client-supplied organization or team identifier alone.
  select o.id, t.id, c.id, e.id
  into v_org, v_tournament, v_category, v_team
  from public.organizaciones o
  join public.torneos t on t.organizacion_id = o.id
  join public.categorias c on c.torneo_id = t.id
  join public.equipos e on e.categoria_id = c.id
  where o.id = v_user.organizacion_id
    and o.slug = split_part(p_name,'/',1)
    and t.temporada = split_part(p_name,'/',2)
    and regexp_replace(
      regexp_replace(lower(translate(c.nombre, 'áéíóúñÁÉÍÓÚÑ', 'aeiounAEIOUN')),
                     '[^a-z0-9]+', '-', 'g'),
      '(^-+|-+$)', '', 'g'
    ) = split_part(p_name,'/',3)
    and (
      e.id::text = split_part(p_name,'/',4)
      or regexp_replace(lower(e.nombre),'[^a-z0-9]+','-','g') = split_part(p_name,'/',4)
    )
  limit 1;
  if v_team is null then return false; end if;

  if v_user.role in ('asociacion','admin_general') then
    -- Association must possess actual review scope (not merely role title).
    select exists (
      select 1 from public.app_user_permissions p
      where p.user_id = v_user.id and p.organizacion_id = v_org
        and p.torneo_id = v_tournament and p.categoria_id = v_category
        and p.can_review_documents
        and (p.equipo_id is null or p.equipo_id = v_team)
    ) into v_authorized;
  elsif v_user.role = 'delegado' then
    select exists (
      select 1 from public.app_user_permissions p
      where p.user_id = v_user.id and p.organizacion_id = v_org
        and p.torneo_id = v_tournament and p.categoria_id = v_category
        and p.equipo_id = v_team and p.can_view and p.can_load_documents
    ) into v_authorized;
  end if;
  if not v_authorized or (p_action = 'upload' and v_user.role <> 'delegado') then
    return false;
  end if;

  if split_part(p_name,'/',5) = 'jugadores' then
    if split_part(p_name,'/',6) = '' or split_part(p_name,'/',7) = ''
      or split_part(p_name,'/',8) = '' or split_part(p_name,'/',9) <> '' then
      return false;
    end if;
    -- Compare UUIDs as text first to reject malformed paths without an exception.
    select exists(
      select 1 from public.player_documents d
      join public.team_players tp on tp.id = d.player_id
      join public.document_requirements r on r.id = d.requirement_id
      where d.player_id::text = split_part(p_name,'/',6)
        and d.requirement_id::text = split_part(p_name,'/',7)
        and d.organizacion_id = v_org and d.torneo_id = v_tournament
        and d.categoria_id = v_category and d.equipo_id = v_team
        and tp.organizacion_id = v_org and tp.torneo_id = v_tournament
        and tp.categoria_id = v_category and tp.equipo_id = v_team
        and tp.activo
        and r.scope = 'player'
        and r.categoria_id = v_category
        and r.torneo_id = v_tournament and r.organizacion_id = v_org
        and (p_action = 'upload' or d.storage_path = p_name)
    ) into v_authorized;
  else
    if split_part(p_name,'/',5) = '' or split_part(p_name,'/',6) = ''
      or split_part(p_name,'/',7) <> '' then return false; end if;
    select exists(
      select 1 from public.team_documents d
      join public.document_requirements r on r.id = d.requirement_id
      where d.requirement_id::text = split_part(p_name,'/',5)
        and d.organizacion_id = v_org and d.torneo_id = v_tournament
        and d.categoria_id = v_category and d.equipo_id = v_team
        and r.scope = 'team'
        and r.categoria_id = v_category
        and r.torneo_id = v_tournament and r.organizacion_id = v_org
        and (p_action = 'upload' or d.storage_path = p_name)
    ) into v_authorized;
  end if;
  return coalesce(v_authorized, false);
end;
$apdb_path$;

revoke all on function public.apdb_storage_path_allowed(text,text) from public, anon, authenticated;
grant execute on function public.apdb_storage_path_allowed(text,text) to authenticated;

drop policy if exists apdb_documents_insert on storage.objects;
drop policy if exists apdb_documents_select on storage.objects;
drop policy if exists apdb_documents_update on storage.objects;
drop policy if exists apdb_documents_delete on storage.objects;

create policy apdb_documents_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'documentos'
  and public.apdb_storage_path_allowed(name,'upload')
);

create policy apdb_documents_select on storage.objects
for select to authenticated
using (
  bucket_id = 'documentos'
  and public.apdb_storage_path_allowed(name,'read')
);

-- Revisions use immutable, timestamped object names. Neither delegate nor
-- Association can overwrite or delete an existing document via Storage.
-- Service-role backup/recovery remains a separately authorized operation.
commit;
