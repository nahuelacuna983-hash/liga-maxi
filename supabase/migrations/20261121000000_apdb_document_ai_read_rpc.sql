begin;

-- Read-only, scope-checked access for the existing OCR view.  The view is
-- intentionally not exposed directly because its postgres ownership would
-- bypass the caller's document scope.
create or replace function public.apdb_list_document_ai_audits(p_categoria_id uuid default null)
returns table (
  id uuid,
  scope text,
  team_document_id uuid,
  player_document_id uuid,
  organizacion_id uuid,
  torneo_id uuid,
  categoria_id uuid,
  equipo_id uuid,
  equipo_nombre text,
  player_name text,
  file_name text,
  audit_status text,
  confidence numeric,
  summary text,
  findings jsonb,
  checks jsonb,
  criteria_version text,
  unresolved_reason text,
  page_evidence jsonb,
  source_kind text,
  source_file_id text,
  source_hash text,
  audited_by text,
  audited_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public, auth
as $$
declare
  actor public.app_users%rowtype;
begin
  select u.* into actor
  from public.app_users u
  where u.auth_user_id = auth.uid() and u.active;

  if actor.id is null then
    raise exception 'identidad no autorizada para consultar auditorias OCR' using errcode = '42501';
  end if;

  return query
  select v.id, v.scope, v.team_document_id, v.player_document_id,
    v.organizacion_id, v.torneo_id, v.categoria_id, v.equipo_id,
    v.equipo_nombre, v.player_name, v.file_name, v.audit_status,
    v.confidence, v.summary, v.findings, v.checks, v.criteria_version,
    v.unresolved_reason, v.page_evidence, v.source_kind, v.source_file_id,
    v.source_hash, v.audited_by, v.audited_at
  from public.v_document_ai_audits_latest v
  where v.organizacion_id = actor.organizacion_id
    and (p_categoria_id is null or v.categoria_id = p_categoria_id)
    and (
      (actor.role in ('admin_general', 'asociacion') and exists (
        select 1 from public.app_user_permissions p
        where p.user_id = actor.id
          and p.organizacion_id = v.organizacion_id
          and (p.torneo_id is null or p.torneo_id = v.torneo_id)
          and (p.categoria_id is null or p.categoria_id = v.categoria_id)
          and (p.equipo_id is null or p.equipo_id = v.equipo_id)
          and p.can_review_documents
      ))
      or (actor.role = 'delegado' and exists (
        select 1 from public.app_user_permissions p
        where p.user_id = actor.id
          and p.organizacion_id = v.organizacion_id
          and (p.torneo_id is null or p.torneo_id = v.torneo_id)
          and (p.categoria_id is null or p.categoria_id = v.categoria_id)
          and (p.equipo_id is null or p.equipo_id = v.equipo_id)
          and p.can_load_documents
      ))
      or actor.role = 'auditor_ocr'
    );
end;
$$;

revoke all on function public.apdb_list_document_ai_audits(uuid) from public, anon;
grant execute on function public.apdb_list_document_ai_audits(uuid) to authenticated;

commit;
