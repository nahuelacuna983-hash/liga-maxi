-- APdB Liga Maxi - Seed documental inicial para temporada 2026
-- Borrador especifico segun estructura observada en Supabase.
-- Revisar antes de ejecutar.

-- IDs observados:
-- organizacion_id: 4fc0ec74-71d3-43cc-9509-f788aceaedf1
-- torneo_id: 7d0971e3-66ee-4791-bcbf-bace1d2fefb9
--
-- categorias:
-- Maxi +48:   74f562fd-ae9c-434e-8df5-6d08eab7b6d6
-- Maxi +35 B: 1f35934d-c6f5-412f-9eed-85244c202558
-- Maxi +35 A: ab12ccf1-af93-4c17-b220-ec01c2b49df8
-- Femenino:   91aa11de-b9c4-4b86-9888-f25e20c10710

-- Requisitos generales del torneo.
-- categoria_id null significa que aplica a todas las categorias del torneo.
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
  seed.organizacion_id::uuid,
  seed.torneo_id::uuid,
  seed.categoria_id::uuid,
  seed.nombre,
  seed.descripcion,
  seed.obligatorio,
  seed.requiere_vencimiento,
  seed.activo
from (
values
  (
    '4fc0ec74-71d3-43cc-9509-f788aceaedf1',
    '7d0971e3-66ee-4791-bcbf-bace1d2fefb9',
    null,
    'Lista de buena fe',
    'Nomina oficial del equipo.',
    true,
    false,
    true
  ),
  (
    '4fc0ec74-71d3-43cc-9509-f788aceaedf1',
    '7d0971e3-66ee-4791-bcbf-bace1d2fefb9',
    null,
    'Certificado medico',
    'Apto medico de jugadores.',
    true,
    true,
    true
  ),
  (
    '4fc0ec74-71d3-43cc-9509-f788aceaedf1',
    '7d0971e3-66ee-4791-bcbf-bace1d2fefb9',
    null,
    'Seguro',
    'Cobertura vigente del equipo o jugadores.',
    true,
    true,
    true
  ),
  (
    '4fc0ec74-71d3-43cc-9509-f788aceaedf1',
    '7d0971e3-66ee-4791-bcbf-bace1d2fefb9',
    null,
    'Declaracion jurada',
    'Declaracion requerida por la Asociacion.',
    true,
    false,
    true
  ),
  (
    '4fc0ec74-71d3-43cc-9509-f788aceaedf1',
    '7d0971e3-66ee-4791-bcbf-bace1d2fefb9',
    null,
    'Imagenes para redes',
    'Material visual autorizado para comunicacion y redes.',
    false,
    false,
    true
  ),
  (
    '4fc0ec74-71d3-43cc-9509-f788aceaedf1',
    '7d0971e3-66ee-4791-bcbf-bace1d2fefb9',
    null,
    'Pase',
    'Pase o autorizacion administrativa del jugador.',
    true,
    false,
    true
  )
) as seed(organizacion_id, torneo_id, categoria_id, nombre, descripcion, obligatorio, requiere_vencimiento, activo)
where not exists (
  select 1
  from public.document_requirements dr
  where dr.torneo_id = seed.torneo_id::uuid
    and dr.categoria_id is null
    and lower(dr.nombre) = lower(seed.nombre)
);
