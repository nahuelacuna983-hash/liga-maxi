-- APdB Liga Maxi - Completar casilleros documentales de GONNET
-- Crea solamente los requisitos de equipo que aun no tengan registro.
-- No inventa archivos, no aprueba documentos y no modifica los existentes.

insert into public.team_documents (
  requirement_id,
  organizacion_id,
  torneo_id,
  categoria_id,
  equipo_id,
  equipo_nombre,
  status,
  observacion,
  created_at,
  updated_at
)
select
  dr.id,
  coalesce(dr.organizacion_id, t.organizacion_id),
  c.torneo_id,
  e.categoria_id,
  e.id,
  e.nombre,
  'pendiente',
  'Pendiente de carga',
  now(),
  now()
from public.equipos e
join public.categorias c on c.id = e.categoria_id
join public.torneos t on t.id = c.torneo_id
join public.document_requirements dr
  on dr.activo = true
 and dr.scope = 'team'
 and dr.torneo_id = c.torneo_id
 and (dr.categoria_id is null or dr.categoria_id = c.id)
where e.id = 'e6d7187a-6d07-438d-a73a-5790173ca337'::uuid
  and c.id = '60445e76-630b-4a4d-a181-4160baa50f9b'::uuid
  and not exists (
    select 1
    from public.team_documents td
    where td.requirement_id = dr.id
      and td.categoria_id = c.id
      and td.equipo_id = e.id
  );

select
  c.nombre as categoria,
  e.nombre as equipo,
  dr.nombre as documento,
  td.status as estado,
  td.file_name as archivo,
  td.observacion
from public.team_documents td
join public.document_requirements dr on dr.id = td.requirement_id
join public.categorias c on c.id = td.categoria_id
join public.equipos e on e.id = td.equipo_id
where td.categoria_id = '60445e76-630b-4a4d-a181-4160baa50f9b'::uuid
  and td.equipo_id = 'e6d7187a-6d07-438d-a73a-5790173ca337'::uuid
order by dr.nombre;

