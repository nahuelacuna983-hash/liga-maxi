-- APdB Liga Maxi - Generar pendientes documentales iniciales
-- Ejecutar solo despues de revisar requisitos y equipos.
-- Crea un registro pendiente por cada equipo activo y requisito activo aplicable.
-- No toca partidos, resultados, categorias ni fixtures.

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
  dr.id as requirement_id,
  coalesce(dr.organizacion_id, t.organizacion_id) as organizacion_id,
  c.torneo_id,
  e.categoria_id,
  e.id as equipo_id,
  e.nombre as equipo_nombre,
  'pendiente' as status,
  'Pendiente de carga' as observacion
from public.equipos e
join public.categorias c on c.id = e.categoria_id
join public.torneos t on t.id = c.torneo_id
join public.document_requirements dr
  on dr.activo = true
  and dr.torneo_id = c.torneo_id
  and (
    dr.categoria_id is null
    or dr.categoria_id = e.categoria_id
  )
where e.activo = true
  and c.torneo_id = '7d0971e3-66ee-4791-bcbf-bace1d2fefb9'::uuid
  and not exists (
    select 1
    from public.team_documents td
    where td.requirement_id = dr.id
      and td.equipo_id = e.id
  );

-- Verificacion: resumen por estado
select
  status,
  count(*) as cantidad
from public.team_documents
group by status
order by status;

-- Verificacion: pendientes por categoria
select
  c.nombre as categoria,
  count(*) as pendientes
from public.team_documents td
join public.categorias c on c.id = td.categoria_id
where td.status = 'pendiente'
group by c.nombre
order by c.nombre;

