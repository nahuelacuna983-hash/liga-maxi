-- APdB 2026 - Completar documentos generales de UNIVERSAL.
-- No modifica jugadores, partidos, resultados, fixture ni posiciones.

begin;

insert into public.document_requirements (
  organizacion_id,
  torneo_id,
  categoria_id,
  nombre,
  descripcion,
  obligatorio,
  requiere_vencimiento,
  activo,
  scope,
  allows_multiple_files
)
select
  '4fc0ec74-71d3-43cc-9509-f788aceaedf1'::uuid,
  '21676aa8-5587-489f-b0e7-0808aff25de4'::uuid,
  '4913ba85-2459-426a-9124-1164a4fb0363'::uuid,
  v.nombre,
  v.descripcion,
  true,
  v.requiere_vencimiento,
  true,
  'team',
  false
from (
  values
    ('Lista de buena fe', 'Nomina oficial del equipo.', false),
    ('Seguro', 'Poliza o certificado y nomina de jugadores.', true)
) as v(nombre, descripcion, requiere_vencimiento)
where not exists (
  select 1
  from public.document_requirements r
  where r.organizacion_id = '4fc0ec74-71d3-43cc-9509-f788aceaedf1'::uuid
    and r.torneo_id = '21676aa8-5587-489f-b0e7-0808aff25de4'::uuid
    and r.categoria_id = '4913ba85-2459-426a-9124-1164a4fb0363'::uuid
    and lower(trim(r.nombre)) = lower(trim(v.nombre))
);

insert into public.team_documents (
  requirement_id,
  organizacion_id,
  torneo_id,
  categoria_id,
  equipo_id,
  equipo_nombre,
  status,
  observacion
)
select
  r.id,
  r.organizacion_id,
  r.torneo_id,
  r.categoria_id,
  'c8146d14-57d4-423d-b686-7046ee30bf18'::uuid,
  'UNIVERSAL',
  'pendiente',
  'Pendiente de carga.'
from public.document_requirements r
where r.organizacion_id = '4fc0ec74-71d3-43cc-9509-f788aceaedf1'::uuid
  and r.torneo_id = '21676aa8-5587-489f-b0e7-0808aff25de4'::uuid
  and r.categoria_id = '4913ba85-2459-426a-9124-1164a4fb0363'::uuid
  and r.scope = 'team'
  and r.nombre in ('Lista de buena fe', 'Seguro')
  and not exists (
    select 1
    from public.team_documents td
    where td.requirement_id = r.id
      and td.torneo_id = r.torneo_id
      and td.categoria_id = r.categoria_id
      and td.equipo_id = 'c8146d14-57d4-423d-b686-7046ee30bf18'::uuid
  );

update public.team_documents td
set
  uploaded_by = 'importacion_administrativa_universal_2026',
  storage_path = case r.nombre
    when 'Seguro' then 'apdb/2026/maxi-35-a/c8146d14-57d4-423d-b686-7046ee30bf18/equipo/importacion-universal-2026-seguro.pdf'
    when 'Lista de buena fe' then 'apdb/2026/maxi-35-a/c8146d14-57d4-423d-b686-7046ee30bf18/equipo/importacion-universal-2026-lista-buena-fe.pdf'
  end,
  file_name = case r.nombre
    when 'Seguro' then 'UNIVERSAL - Seguro 2026.pdf'
    when 'Lista de buena fe' then 'UNIVERSAL - Lista de buena fe 2026.pdf'
  end,
  file_type = 'application/pdf',
  file_size = case r.nombre
    when 'Seguro' then 401997
    when 'Lista de buena fe' then 5659
  end,
  status = 'cargado',
  vencimiento = null,
  observacion = 'Importado desde Drive como carga inicial delegada. Pendiente de lectura y aprobacion final APdB.',
  reviewed_by = null,
  reviewed_at = null,
  updated_at = now()
from public.document_requirements r
where td.requirement_id = r.id
  and td.torneo_id = '21676aa8-5587-489f-b0e7-0808aff25de4'::uuid
  and td.categoria_id = '4913ba85-2459-426a-9124-1164a4fb0363'::uuid
  and td.equipo_id = 'c8146d14-57d4-423d-b686-7046ee30bf18'::uuid
  and r.nombre in ('Lista de buena fe', 'Seguro');

insert into public.document_events (team_document_id, event_type, actor, detail)
select
  td.id,
  'uploaded',
  'importacion_administrativa_universal_2026',
  'Documento general importado desde Drive como carga inicial del equipo.'
from public.team_documents td
join public.document_requirements r on r.id = td.requirement_id
where td.torneo_id = '21676aa8-5587-489f-b0e7-0808aff25de4'::uuid
  and td.categoria_id = '4913ba85-2459-426a-9124-1164a4fb0363'::uuid
  and td.equipo_id = 'c8146d14-57d4-423d-b686-7046ee30bf18'::uuid
  and r.nombre in ('Lista de buena fe', 'Seguro')
  and not exists (
    select 1
    from public.document_events de
    where de.team_document_id = td.id
      and de.actor = 'importacion_administrativa_universal_2026'
      and de.event_type = 'uploaded'
  );

commit;

select
  equipo_nombre,
  requirement_nombre,
  status,
  file_name,
  observacion
from public.v_team_documents_admin
where torneo_id = '21676aa8-5587-489f-b0e7-0808aff25de4'::uuid
  and categoria_id = '4913ba85-2459-426a-9124-1164a4fb0363'::uuid
  and equipo_id = 'c8146d14-57d4-423d-b686-7046ee30bf18'::uuid
order by requirement_nombre;
