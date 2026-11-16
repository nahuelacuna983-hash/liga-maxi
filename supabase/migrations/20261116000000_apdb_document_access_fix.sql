-- APdB 2027 staging only: scoped document read access.
-- This migration is prepared for review and is intentionally not applied here.
begin;

create or replace function public.apdb_document_access_allowed(
  p_organizacion_id uuid,
  p_categoria_id uuid,
  p_equipo_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
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
$$;

alter function public.apdb_document_access_allowed(uuid, uuid, uuid)
  owner to postgres;
revoke all on function public.apdb_document_access_allowed(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.apdb_document_access_allowed(uuid, uuid, uuid)
  to postgres;

create or replace view public.v_team_documents_admin
with (security_barrier = true)
as
select
  td.id,
  td.requirement_id,
  dr.nombre as requirement_nombre,
  td.organizacion_id,
  o.nombre as organizacion_nombre,
  td.torneo_id,
  t.nombre as torneo_nombre,
  td.categoria_id,
  c.nombre as categoria_nombre,
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
from public.team_documents td
left join public.document_requirements dr on dr.id = td.requirement_id
left join public.organizaciones o on o.id = td.organizacion_id
left join public.torneos t on t.id = td.torneo_id
left join public.categorias c on c.id = td.categoria_id
where public.apdb_document_access_allowed(
  td.organizacion_id,
  td.categoria_id,
  td.equipo_id
);

revoke all on public.v_team_documents_admin from public, anon, authenticated;
grant select on public.v_team_documents_admin to authenticated;

commit;
