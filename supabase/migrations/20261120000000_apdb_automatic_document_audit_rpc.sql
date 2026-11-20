begin;

-- The worker is a distinct technical identity, never a human Association or delegate.
alter table public.app_users drop constraint if exists app_users_role_check;
alter table public.app_users add constraint app_users_role_check
  check (role = any (array['admin_general','asociacion','delegado','jugador','publico','auditor_ocr']));

create or replace function public.apdb_record_automatic_document_audit(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor uuid := auth.uid();
  scope_value text := p_payload->>'scope';
  document_id uuid;
  existing_id uuid;
  criteria_version_value text := coalesce(p_payload->>'criteria_version', 'APDB_MAXI_2026_V1');
  source_hash_value text := p_payload->>'source_hash';
  source_file_id_value text := p_payload->>'source_file_id';
  unexpected_key text;
begin
  if actor is null then
    raise exception 'autenticacion requerida' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.app_users
    where auth_user_id = actor and active and role = 'auditor_ocr'
  ) then
    raise exception 'identidad no autorizada para auditoria automatica' using errcode = '42501';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'payload de auditoria invalido' using errcode = '22023';
  end if;

  select key into unexpected_key
  from jsonb_object_keys(p_payload) as item(key)
  where key not in (
    'scope','team_document_id','player_document_id','organizacion_id','torneo_id',
    'categoria_id','equipo_id','equipo_nombre','player_id','player_name',
    'requirement_id','requirement_nombre','criteria_version','audit_status','summary',
    'findings','extracted_text','detected_dates','checks','model','raw_response',
    'source_kind','source_file_id','source_hash','page_evidence','file_name',
    'file_type','storage_path','confidence','valid_until','unresolved_reason'
  )
  limit 1;
  if unexpected_key is not null then
    raise exception 'campo no permitido en auditoria: %', unexpected_key using errcode = '22023';
  end if;

  if scope_value not in ('team', 'player') then
    raise exception 'scope documental invalido' using errcode = '22023';
  end if;
  if coalesce(p_payload->>'audit_status', '') not in ('pendiente','validado','listo_aprobar','revisar','observado','rechazado','vencido','error') then
    raise exception 'estado de auditoria invalido' using errcode = '22023';
  end if;
  if coalesce(p_payload->>'human_decision_required', 'true') <> 'true' then
    raise exception 'la auditoria automatica siempre requiere decision humana' using errcode = '42501';
  end if;
  if p_payload ?| array['approved','reviewed_by','reviewed_at','document_status','habilitado'] then
    raise exception 'el payload no puede modificar una decision humana' using errcode = '42501';
  end if;
  if source_hash_value is null or source_file_id_value is null then
    raise exception 'source_hash y source_file_id son obligatorios' using errcode = '22023';
  end if;
  if not exists (select 1 from public.document_audit_criteria_versions where version = criteria_version_value and active) then
    raise exception 'version de criterios no vigente' using errcode = '22023';
  end if;

  if scope_value = 'team' then
    document_id := (p_payload->>'team_document_id')::uuid;
    if p_payload->>'player_document_id' is not null then
      raise exception 'un documento de equipo no puede incluir documento de jugador' using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.team_documents d
      where d.id = document_id
        and d.requirement_id = (p_payload->>'requirement_id')::uuid
        and d.organizacion_id = (p_payload->>'organizacion_id')::uuid
        and d.torneo_id = (p_payload->>'torneo_id')::uuid
        and d.categoria_id = (p_payload->>'categoria_id')::uuid
        and d.equipo_id = (p_payload->>'equipo_id')::uuid
    ) then
      raise exception 'documento de equipo fuera de contexto o inexistente' using errcode = '42501';
    end if;
  else
    document_id := (p_payload->>'player_document_id')::uuid;
    if p_payload->>'team_document_id' is not null then
      raise exception 'un documento de jugador no puede incluir documento de equipo' using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.player_documents d
      where d.id = document_id
        and d.requirement_id = (p_payload->>'requirement_id')::uuid
        and d.organizacion_id = (p_payload->>'organizacion_id')::uuid
        and d.torneo_id = (p_payload->>'torneo_id')::uuid
        and d.categoria_id = (p_payload->>'categoria_id')::uuid
        and d.equipo_id = (p_payload->>'equipo_id')::uuid
    ) then
      raise exception 'documento de jugador fuera de contexto o inexistente' using errcode = '42501';
    end if;
  end if;

  select id into existing_id
  from public.document_ai_audits
  where ((scope_value = 'team' and team_document_id = document_id)
      or (scope_value = 'player' and player_document_id = document_id))
    and source_file_id = source_file_id_value
    and source_hash = source_hash_value
    and criteria_version = criteria_version_value
  order by audited_at desc
  limit 1;
  if existing_id is not null then
    return existing_id;
  end if;

  insert into public.document_ai_audits (
    scope, team_document_id, player_document_id, organizacion_id, torneo_id, categoria_id, equipo_id,
    equipo_nombre, player_id, player_name, requirement_id, requirement_nombre, storage_path, file_name,
    file_type, audit_status, confidence, summary, findings, extracted_text, detected_dates, checks, model,
    raw_response, audited_by, criteria_version, unresolved_reason, page_evidence, source_kind,
    source_file_id, source_hash
  ) values (
    scope_value, case when scope_value = 'team' then document_id end,
    case when scope_value = 'player' then document_id end,
    (p_payload->>'organizacion_id')::uuid, (p_payload->>'torneo_id')::uuid,
    (p_payload->>'categoria_id')::uuid, (p_payload->>'equipo_id')::uuid,
    p_payload->>'equipo_nombre', nullif(p_payload->>'player_id','')::uuid, p_payload->>'player_name',
    (p_payload->>'requirement_id')::uuid, p_payload->>'requirement_nombre', p_payload->>'storage_path',
    p_payload->>'file_name', p_payload->>'file_type', p_payload->>'audit_status',
    nullif(p_payload->>'confidence','')::numeric, p_payload->>'summary', coalesce(p_payload->'findings','{}'::jsonb),
    p_payload->>'extracted_text', coalesce(p_payload->'detected_dates','[]'::jsonb), coalesce(p_payload->'checks','{}'::jsonb),
    p_payload->>'model', coalesce(p_payload->'raw_response','{}'::jsonb),
    'auditoria-local-ocr:' || actor::text, criteria_version_value, p_payload->>'unresolved_reason',
    coalesce(p_payload->'page_evidence','[]'::jsonb), coalesce(p_payload->>'source_kind','local_file'),
    source_file_id_value, source_hash_value
  ) returning id into existing_id;
  return existing_id;
end;
$$;

alter function public.apdb_record_automatic_document_audit(jsonb) owner to postgres;
revoke all on function public.apdb_record_automatic_document_audit(jsonb) from public, anon, authenticated;
grant execute on function public.apdb_record_automatic_document_audit(jsonb) to authenticated;
revoke all on public.document_ai_audits from public, anon, authenticated;

commit;
