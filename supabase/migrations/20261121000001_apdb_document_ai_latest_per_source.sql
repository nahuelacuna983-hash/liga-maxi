begin;

-- Keep the newest audit for each document *and source file*.  A single
-- document can legitimately have separate certificate and ECG files.
create or replace view public.v_document_ai_audits_latest as
select distinct on (coalesce(team_document_id, player_document_id), scope, source_file_id)
  id, scope, team_document_id, player_document_id, organizacion_id, torneo_id,
  categoria_id, equipo_id, equipo_nombre, player_id, player_name, requirement_id,
  requirement_nombre, storage_path, file_name, file_type, audit_status, confidence,
  summary, findings, extracted_text, detected_dates, valid_until, checks,
  criteria_version, unresolved_reason, page_evidence, source_kind, source_file_id,
  source_file_url, source_modified_at, source_hash, model, audited_by, audited_at,
  created_at, updated_at
from public.document_ai_audits
order by coalesce(team_document_id, player_document_id), scope, source_file_id, audited_at desc;

commit;
