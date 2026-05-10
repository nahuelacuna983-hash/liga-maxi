-- APdB Liga Maxi - Consultas de prueba del modulo documentacion
-- Solo SELECT. No modifican datos.

-- 1. Ver requisitos activos por torneo/categoria
select
  dr.id,
  dr.nombre,
  dr.descripcion,
  dr.obligatorio,
  dr.requiere_vencimiento,
  c.nombre as categoria_nombre,
  t.nombre as torneo_nombre
from public.document_requirements dr
left join public.categorias c on c.id = dr.categoria_id
left join public.torneos t on t.id = dr.torneo_id
where dr.activo = true
order by c.nombre nulls first, dr.nombre;

-- 2. Ver documentos cargados o pendientes desde vista administrativa
select
  categoria_nombre,
  equipo_nombre,
  requirement_nombre,
  status,
  vencimiento,
  observacion,
  uploaded_by,
  reviewed_by,
  updated_at
from public.v_team_documents_admin
order by categoria_nombre, equipo_nombre, requirement_nombre;

-- 3. Pendientes y observados para tablero de Asociacion
select
  categoria_nombre,
  equipo_nombre,
  requirement_nombre,
  status,
  observacion
from public.v_team_documents_admin
where status in ('pendiente', 'observado', 'vencido')
order by categoria_nombre, equipo_nombre, requirement_nombre;

-- 4. Resumen por estado
select
  status,
  count(*) as cantidad
from public.team_documents
group by status
order by status;

-- 5. Vencimientos proximos
select
  categoria_nombre,
  equipo_nombre,
  requirement_nombre,
  vencimiento,
  status
from public.v_team_documents_admin
where vencimiento is not null
  and vencimiento between current_date and current_date + interval '30 days'
order by vencimiento asc;

