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
  );

-- Requisito especifico para Femenino.
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
values
  (
    '4fc0ec74-71d3-43cc-9509-f788aceaedf1',
    '7d0971e3-66ee-4791-bcbf-bace1d2fefb9',
    '91aa11de-b9c4-4b86-9888-f25e20c10710',
    'Imagenes para redes',
    'Material visual autorizado para comunicacion y redes.',
    false,
    false,
    true
  );

