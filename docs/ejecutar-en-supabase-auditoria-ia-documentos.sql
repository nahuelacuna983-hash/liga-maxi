-- APdB Liga Maxi - Auditoria automatica de documentos con IA/OCR
-- Ejecutar completo en Supabase SQL Editor, en una consulta nueva.
--
-- Objetivo:
-- 1) crear una tabla de dictamen automatico sobre documentos ya subidos a Storage privado;
-- 2) no mover archivos, no publicar enlaces y no tocar resultados/fixtures;
-- 3) dejar preparada la app para mostrar lectura automatica + aprobacion administrativa.
--
-- Importante:
-- - Esta tabla guarda resultados de lectura; los archivos siguen en bucket privado "documentos".
-- - La aprobacion final sigue siendo administrativa, usando review_team_document/review_player_document.

begin;

create table if not exists public.document_audit_criteria_versions (
  version text primary key,
  title text not null,
  criteria jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.document_audit_criteria_versions (
  version,
  title,
  criteria
)
values (
  'APDB_MAXI_2026_V1',
  'APdB Maxi Basquet 2026 - criterios documentales',
  jsonb_build_object(
    'djdr', 'Fecha del anio corriente y firma visible. Nombre escrito no equivale a firma.',
    'medico', 'Certificado de aptitud fisica deportiva y estudio complementario. El estudio debe ser del mismo dia o anterior al certificado, con margen maximo de 30 dias posteriores. Vigencia 12 meses.',
    'buena_fe', 'Lista de buena fe con sello o recibido APdB.',
    'seguro', 'Poliza/certificado con nomina nominal o aceptacion provisoria si lo gestiona APdB.',
    'pase', 'No bloquea habilitacion general salvo traspaso puntual.',
    'dudas', 'Los casos no resueltos quedan pendientes/revisar; no se convierten automaticamente en incumplimiento.',
    'regresion_banco', jsonb_build_array(
      'Raffa: ECG + certificado APTO del mismo dia puede validar como complemento alternativo aunque haya ergometria adicional posterior.',
      'Suppes: distinguir fechas visibles de texto extraido/metadatos impresos.',
      'Barragan: DJDR sin firma visible no queda validada por tener nombre/datos escritos.'
    )
  )
)
on conflict (version) do update
set title = excluded.title,
    criteria = excluded.criteria,
    active = true;

create table if not exists public.document_ai_audits (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('team', 'player')),
  team_document_id uuid references public.team_documents(id) on delete cascade,
  player_document_id uuid references public.player_documents(id) on delete cascade,
  organizacion_id uuid references public.organizaciones(id),
  torneo_id uuid references public.torneos(id),
  categoria_id uuid references public.categorias(id),
  equipo_id uuid references public.equipos(id),
  equipo_nombre text,
  player_id uuid references public.team_players(id) on delete set null,
  player_name text,
  requirement_id uuid references public.document_requirements(id),
  requirement_nombre text,
  storage_path text,
  file_name text,
  file_type text,
  audit_status text not null default 'pendiente'
    check (audit_status in ('pendiente', 'validado', 'listo_aprobar', 'revisar', 'observado', 'rechazado', 'vencido', 'error')),
  confidence numeric(5,2),
  summary text,
  findings jsonb not null default '{}'::jsonb,
  extracted_text text,
  detected_dates jsonb not null default '[]'::jsonb,
  valid_until date,
  checks jsonb not null default '{}'::jsonb,
  criteria_version text not null default 'APDB_MAXI_2026_V1',
  unresolved_reason text,
  page_evidence jsonb not null default '[]'::jsonb,
  source_kind text not null default 'supabase_storage',
  source_file_id text,
  source_file_url text,
  source_modified_at timestamptz,
  source_hash text,
  model text,
  raw_response jsonb,
  audited_by text not null default 'auditoria-ia',
  audited_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_ai_audits_document_check
    check (
      (scope = 'team' and team_document_id is not null and player_document_id is null)
      or
      (scope = 'player' and player_document_id is not null and team_document_id is null)
    )
);

create index if not exists idx_document_ai_audits_team_document
  on public.document_ai_audits(team_document_id);

create index if not exists idx_document_ai_audits_player_document
  on public.document_ai_audits(player_document_id);

create index if not exists idx_document_ai_audits_categoria_equipo
  on public.document_ai_audits(categoria_id, equipo_id);

create index if not exists idx_document_ai_audits_status
  on public.document_ai_audits(audit_status);

create index if not exists idx_document_ai_audits_audited_at
  on public.document_ai_audits(audited_at desc);

create index if not exists idx_document_ai_audits_criteria_version
  on public.document_ai_audits(criteria_version);

create index if not exists idx_document_ai_audits_source
  on public.document_ai_audits(source_kind, source_file_id);

alter table public.document_ai_audits
  add column if not exists criteria_version text not null default 'APDB_MAXI_2026_V1',
  add column if not exists unresolved_reason text,
  add column if not exists page_evidence jsonb not null default '[]'::jsonb,
  add column if not exists source_kind text not null default 'supabase_storage',
  add column if not exists source_file_id text,
  add column if not exists source_file_url text,
  add column if not exists source_modified_at timestamptz,
  add column if not exists source_hash text;

drop trigger if exists trg_document_ai_audits_updated_at on public.document_ai_audits;

create trigger trg_document_ai_audits_updated_at
before update on public.document_ai_audits
for each row
execute function public.set_updated_at();

create or replace view public.v_document_ai_audits_latest as
select distinct on (
  coalesce(team_document_id, player_document_id),
  scope
)
  id,
  scope,
  team_document_id,
  player_document_id,
  organizacion_id,
  torneo_id,
  categoria_id,
  equipo_id,
  equipo_nombre,
  player_id,
  player_name,
  requirement_id,
  requirement_nombre,
  storage_path,
  file_name,
  file_type,
  audit_status,
  confidence,
  summary,
  findings,
  extracted_text,
  detected_dates,
  valid_until,
  checks,
  criteria_version,
  unresolved_reason,
  page_evidence,
  source_kind,
  source_file_id,
  source_file_url,
  source_modified_at,
  source_hash,
  model,
  audited_by,
  audited_at,
  created_at,
  updated_at
from public.document_ai_audits
order by
  coalesce(team_document_id, player_document_id),
  scope,
  audited_at desc;

create or replace view public.v_team_documents_admin_ai as
select
  td.*,
  ai.audit_status as ai_audit_status,
  ai.confidence as ai_confidence,
  ai.summary as ai_summary,
  ai.findings as ai_findings,
  ai.detected_dates as ai_detected_dates,
  ai.valid_until as ai_valid_until,
  ai.checks as ai_checks,
  ai.criteria_version as ai_criteria_version,
  ai.unresolved_reason as ai_unresolved_reason,
  ai.page_evidence as ai_page_evidence,
  ai.source_kind as ai_source_kind,
  ai.source_file_id as ai_source_file_id,
  ai.audited_at as ai_audited_at
from public.v_team_documents_admin td
left join public.v_document_ai_audits_latest ai
  on ai.scope = 'team'
 and ai.team_document_id = td.id;

create or replace view public.v_player_documents_admin_ai as
select
  pd.*,
  ai.audit_status as ai_audit_status,
  ai.confidence as ai_confidence,
  ai.summary as ai_summary,
  ai.findings as ai_findings,
  ai.detected_dates as ai_detected_dates,
  ai.valid_until as ai_valid_until,
  ai.checks as ai_checks,
  ai.criteria_version as ai_criteria_version,
  ai.unresolved_reason as ai_unresolved_reason,
  ai.page_evidence as ai_page_evidence,
  ai.source_kind as ai_source_kind,
  ai.source_file_id as ai_source_file_id,
  ai.audited_at as ai_audited_at
from public.v_player_documents_admin pd
left join public.v_document_ai_audits_latest ai
  on ai.scope = 'player'
 and ai.player_document_id = pd.id;

grant select on public.v_document_ai_audits_latest to anon, authenticated;
grant select on public.v_team_documents_admin_ai to anon, authenticated;
grant select on public.v_player_documents_admin_ai to anon, authenticated;
grant select on public.document_audit_criteria_versions to anon, authenticated;

select
  'document_ai_audits' as tabla,
  count(*) as registros
from public.document_ai_audits;

commit;
