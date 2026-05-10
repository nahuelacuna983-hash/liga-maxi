-- APdB Liga Maxi - Correccion de requisitos documentales
-- Ejecutar en Supabase SQL Editor.
-- Objetivo:
-- 1. Hacer "Imagenes para redes" general para todas las categorias.
-- 2. Agregar "Pase" como requisito general del torneo.

update public.document_requirements
set categoria_id = null
where torneo_id = '7d0971e3-66ee-4791-bcbf-bace1d2fefb9'::uuid
  and lower(nombre) = lower('Imagenes para redes');

insert into public.document_requirements (
  organizacion_id,
  torneo_id,
  categoria_id,
  nombre,
  descripcion,
  obligatorio,
  requiere_vencimiento,
  activo
)
select
  '4fc0ec74-71d3-43cc-9509-f788aceaedf1'::uuid,
  '7d0971e3-66ee-4791-bcbf-bace1d2fefb9'::uuid,
  null::uuid,
  'Pase',
  'Pase o autorizacion administrativa del jugador.',
  true,
  false,
  true
where not exists (
  select 1
  from public.document_requirements dr
  where dr.torneo_id = '7d0971e3-66ee-4791-bcbf-bace1d2fefb9'::uuid
    and dr.categoria_id is null
    and lower(dr.nombre) = lower('Pase')
);

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
where dr.torneo_id = '7d0971e3-66ee-4791-bcbf-bace1d2fefb9'::uuid
  and dr.activo = true
order by c.nombre nulls first, dr.nombre;

