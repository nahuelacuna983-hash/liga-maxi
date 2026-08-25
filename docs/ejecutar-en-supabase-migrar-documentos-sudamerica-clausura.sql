-- Copia los documentos aprobados de SUD AMERICA del torneo anterior al Clausura APdB 2026.
-- No mueve ni sube archivos: solamente duplica metadatos/enlaces al equipo nuevo.
-- Es idempotente: si ya existen en el torneo nuevo, no los vuelve a crear.

begin;

with torneo_destino as (
  select id
  from public.torneos
  where nombre = 'Clausura APdB'
    and temporada = '2026'
  order by created_at desc
  limit 1
),
documentos_origen as (
  select
    td.requirement_id,
    td.organizacion_id,
    torneo_destino.id as torneo_id_nuevo,
    categoria_nueva.id as categoria_id_nueva,
    equipo_nuevo.id as equipo_id_nuevo,
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
    td.reviewed_at
  from public.team_documents td
  join public.categorias categoria_origen
    on categoria_origen.id = td.categoria_id
  join torneo_destino
    on true
  join public.categorias categoria_nueva
    on categoria_nueva.torneo_id = torneo_destino.id
   and categoria_nueva.nombre = categoria_origen.nombre
  join public.equipos equipo_nuevo
    on equipo_nuevo.categoria_id = categoria_nueva.id
   and equipo_nuevo.nombre = td.equipo_nombre
   and equipo_nuevo.activo = true
  where td.torneo_id = '7d0971e3-66ee-4791-bcbf-bace1d2fefb9'
    and categoria_origen.nombre = 'Maxi +35 A'
    and td.equipo_nombre = 'SUD AMERICA'
    and td.status in ('cargado', 'aprobado', 'observado', 'rechazado', 'vencido')
)
insert into public.team_documents (
  requirement_id,
  organizacion_id,
  torneo_id,
  categoria_id,
  equipo_id,
  equipo_nombre,
  uploaded_by,
  storage_path,
  file_name,
  file_type,
  file_size,
  status,
  vencimiento,
  observacion,
  reviewed_by,
  reviewed_at,
  created_at,
  updated_at
)
select
  requirement_id,
  organizacion_id,
  torneo_id_nuevo,
  categoria_id_nueva,
  equipo_id_nuevo,
  equipo_nombre,
  uploaded_by,
  storage_path,
  file_name,
  file_type,
  file_size,
  status,
  vencimiento,
  observacion,
  reviewed_by,
  reviewed_at,
  now(),
  now()
from documentos_origen origen
where not exists (
  select 1
  from public.team_documents destino
  where destino.torneo_id = origen.torneo_id_nuevo
    and destino.categoria_id = origen.categoria_id_nueva
    and destino.equipo_id = origen.equipo_id_nuevo
    and destino.requirement_id = origen.requirement_id
    and coalesce(destino.file_name, '') = coalesce(origen.file_name, '')
);

select
  equipo_nombre,
  status,
  file_name,
  created_at
from public.team_documents
where torneo_id = (
  select id
  from public.torneos
  where nombre = 'Clausura APdB'
    and temporada = '2026'
  order by created_at desc
  limit 1
)
  and equipo_nombre = 'SUD AMERICA'
order by file_name;

commit;
