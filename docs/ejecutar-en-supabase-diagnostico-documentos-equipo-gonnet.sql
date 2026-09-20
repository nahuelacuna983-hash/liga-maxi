-- APdB Liga Maxi - Diagnostico de documentos generales de GONNET
-- Solo lectura: no modifica datos.

with categorias_gonnet as (
  select distinct
    t.nombre as torneo,
    c.nombre as categoria,
    e.nombre as equipo,
    c.id as categoria_id,
    e.id as equipo_id
  from public.equipos e
  join public.categorias c on c.id = e.categoria_id
  left join public.torneos t on t.id = c.torneo_id
  where upper(trim(e.nombre)) = 'GONNET'
),
documentos as (
  select
    cg.torneo,
    cg.categoria,
    cg.equipo,
    coalesce(dr.nombre, 'REQUISITO SIN NOMBRE') as tipo_documento,
    td.file_name,
    td.status,
    td.vencimiento,
    td.observacion,
    td.storage_path,
    td.created_at
  from categorias_gonnet cg
  left join public.team_documents td
    on td.categoria_id = cg.categoria_id
   and td.equipo_id = cg.equipo_id
  left join public.document_requirements dr on dr.id = td.requirement_id
)
select *
from documentos
order by torneo nulls last, categoria, tipo_documento, created_at;

