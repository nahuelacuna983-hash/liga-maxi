-- Base para auditoria documental importada desde planillas externas.
-- No guarda archivos, solo metadatos y enlaces de evidencia.
-- Esta informacion debe mostrarse solo en modo Asociacion/Admin dentro de la app.

begin;

create table if not exists public.document_audit_results (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid references public.organizaciones(id),
  torneo_id uuid references public.torneos(id),
  categoria_id uuid references public.categorias(id),
  categoria_nombre text,
  equipo_nombre text not null,
  player_id uuid references public.team_players(id) on delete set null,
  player_name text,
  alcance text,
  planilla_arbitro text,
  document_type text not null,
  declared_status text,
  located_status text,
  validated_status text,
  valid_until text,
  audit_status text not null default 'pendiente',
  risk_level text,
  observation text,
  evidence_url text,
  source_sheet text,
  cutoff_date date,
  imported_by text,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_document_audit_results_categoria
  on public.document_audit_results(categoria_id);

create index if not exists idx_document_audit_results_equipo
  on public.document_audit_results(equipo_nombre);

create index if not exists idx_document_audit_results_player
  on public.document_audit_results(player_id);

create index if not exists idx_document_audit_results_status
  on public.document_audit_results(audit_status);

create index if not exists idx_document_audit_results_risk
  on public.document_audit_results(risk_level);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_document_audit_results_updated_at on public.document_audit_results;
create trigger trg_document_audit_results_updated_at
before update on public.document_audit_results
for each row
execute function public.set_updated_at();

create or replace view public.v_document_audit_results_admin as
select
  dar.id,
  dar.organizacion_id,
  dar.torneo_id,
  dar.categoria_id,
  coalesce(c.nombre, dar.categoria_nombre) as categoria_nombre,
  dar.equipo_nombre,
  dar.player_id,
  coalesce(tp.nombre, dar.player_name) as player_name,
  dar.alcance,
  dar.planilla_arbitro,
  dar.document_type,
  dar.declared_status,
  dar.located_status,
  dar.validated_status,
  dar.valid_until,
  dar.audit_status,
  dar.risk_level,
  case
    when lower(coalesce(dar.risk_level, dar.audit_status, '')) like '%critica%'
      or lower(coalesce(dar.risk_level, dar.audit_status, '')) like '%crítica%'
      then 1
    when lower(coalesce(dar.risk_level, dar.audit_status, '')) like '%alta%' then 2
    when lower(coalesce(dar.risk_level, dar.audit_status, '')) like '%media%' then 3
    when lower(coalesce(dar.risk_level, dar.audit_status, '')) like '%validado%'
      or lower(coalesce(dar.risk_level, dar.audit_status, '')) like '%conforme%'
      then 9
    else 5
  end as risk_order,
  dar.observation,
  dar.evidence_url,
  dar.source_sheet,
  dar.cutoff_date,
  dar.imported_by,
  dar.imported_at,
  dar.created_at,
  dar.updated_at
from public.document_audit_results dar
left join public.categorias c on c.id = dar.categoria_id
left join public.team_players tp on tp.id = dar.player_id;

grant select on public.v_document_audit_results_admin to anon, authenticated;

select
  'document_audit_results' as tabla,
  count(*) as registros
from public.document_audit_results;

commit;
