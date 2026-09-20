-- APdB Liga Maxi - Migracion completa de GONNET al Clausura 2026
-- Ejecutar completo en Supabase SQL Editor.
--
-- Copia al torneo vigente:
--   1) la nomina de jugadores de Maxi +35 B;
--   2) sus documentos individuales con archivo;
--   3) los documentos de equipo con archivo.
--
-- No borra ni modifica el torneo anterior, los archivos de Storage ni los
-- documentos aprobados que ya pudieran existir en el destino.
-- Es idempotente: puede volver a ejecutarse sin duplicar jugadores o archivos.

-- Identificadores verificados en la base:
-- origen: Torneo Base APdB / Maxi +35 B / GONNET
-- destino: Clausura APdB 2026 / Maxi +35 B / GONNET

-- 1. Nomina operativa para Delegados.
insert into public.team_players (
  organizacion_id,
  torneo_id,
  categoria_id,
  equipo_id,
  equipo_nombre,
  nombre,
  dni,
  dorsal,
  activo,
  created_by,
  created_at,
  updated_at
)
select
  po.organizacion_id,
  ctx.torneo_destino_id,
  ctx.categoria_destino_id,
  ctx.equipo_destino_id,
  'GONNET',
  po.nombre,
  po.dni,
  po.dorsal,
  true,
  'migracion_administrativa_gonnet_2026',
  now(),
  now()
from public.team_players po
cross join (
  select
    '1f35934d-c6f5-412f-9eed-85244c202558'::uuid as categoria_origen_id,
    '944b40b1-f259-4c4b-b6f1-af5fc98f8c21'::uuid as equipo_origen_id,
    '21676aa8-5587-489f-b0e7-0808aff25de4'::uuid as torneo_destino_id,
    '60445e76-630b-4a4d-a181-4160baa50f9b'::uuid as categoria_destino_id,
    'e6d7187a-6d07-438d-a73a-5790173ca337'::uuid as equipo_destino_id
) ctx
where po.categoria_id = ctx.categoria_origen_id
  and po.equipo_id = ctx.equipo_origen_id
  and po.activo = true
  and not exists (
    select 1
    from public.team_players pd
    where pd.categoria_id = ctx.categoria_destino_id
      and pd.equipo_id = ctx.equipo_destino_id
      and pd.activo = true
      and (
        (nullif(regexp_replace(coalesce(pd.dni, ''), '\D', '', 'g'), '') is not null
          and regexp_replace(coalesce(pd.dni, ''), '\D', '', 'g') = regexp_replace(coalesce(po.dni, ''), '\D', '', 'g'))
        or lower(trim(pd.nombre)) = lower(trim(po.nombre))
      )
  );

-- 2. Documentos individuales que tienen un archivo real asociado.
insert into public.player_documents (
  player_id,
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
  pd.id,
  doc.requirement_id,
  doc.organizacion_id,
  ctx.torneo_destino_id,
  ctx.categoria_destino_id,
  ctx.equipo_destino_id,
  'GONNET',
  doc.uploaded_by,
  doc.storage_path,
  doc.file_name,
  doc.file_type,
  doc.file_size,
  doc.status,
  doc.vencimiento,
  doc.observacion,
  doc.reviewed_by,
  doc.reviewed_at,
  now(),
  now()
from public.player_documents doc
join public.team_players po on po.id = doc.player_id
cross join (
  select
    '1f35934d-c6f5-412f-9eed-85244c202558'::uuid as categoria_origen_id,
    '944b40b1-f259-4c4b-b6f1-af5fc98f8c21'::uuid as equipo_origen_id,
    '21676aa8-5587-489f-b0e7-0808aff25de4'::uuid as torneo_destino_id,
    '60445e76-630b-4a4d-a181-4160baa50f9b'::uuid as categoria_destino_id,
    'e6d7187a-6d07-438d-a73a-5790173ca337'::uuid as equipo_destino_id
) ctx
join public.team_players pd
  on pd.categoria_id = ctx.categoria_destino_id
 and pd.equipo_id = ctx.equipo_destino_id
 and pd.activo = true
 and (
   (nullif(regexp_replace(coalesce(pd.dni, ''), '\D', '', 'g'), '') is not null
     and regexp_replace(coalesce(pd.dni, ''), '\D', '', 'g') = regexp_replace(coalesce(po.dni, ''), '\D', '', 'g'))
   or lower(trim(pd.nombre)) = lower(trim(po.nombre))
 )
where po.categoria_id = ctx.categoria_origen_id
  and po.equipo_id = ctx.equipo_origen_id
  and nullif(trim(coalesce(doc.storage_path, '')), '') is not null
  and nullif(trim(coalesce(doc.file_name, '')), '') is not null
  and not exists (
    select 1
    from public.player_documents existente
    where existente.player_id = pd.id
      and existente.requirement_id = doc.requirement_id
  );

-- Los requisitos faltantes quedan creados como pendientes, sin inventar archivos.
select public.ensure_player_documents(pd.id)
from public.team_players pd
cross join (
  select
    '60445e76-630b-4a4d-a181-4160baa50f9b'::uuid as categoria_destino_id,
    'e6d7187a-6d07-438d-a73a-5790173ca337'::uuid as equipo_destino_id
) ctx
where pd.categoria_id = ctx.categoria_destino_id
  and pd.equipo_id = ctx.equipo_destino_id
  and pd.activo = true;

-- 3. Documentos generales del equipo que tienen archivo.
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
  doc.requirement_id,
  doc.organizacion_id,
  ctx.torneo_destino_id,
  ctx.categoria_destino_id,
  ctx.equipo_destino_id,
  'GONNET',
  doc.uploaded_by,
  doc.storage_path,
  doc.file_name,
  doc.file_type,
  doc.file_size,
  doc.status,
  doc.vencimiento,
  doc.observacion,
  doc.reviewed_by,
  doc.reviewed_at,
  now(),
  now()
from public.team_documents doc
cross join (
  select
    '1f35934d-c6f5-412f-9eed-85244c202558'::uuid as categoria_origen_id,
    '944b40b1-f259-4c4b-b6f1-af5fc98f8c21'::uuid as equipo_origen_id,
    '21676aa8-5587-489f-b0e7-0808aff25de4'::uuid as torneo_destino_id,
    '60445e76-630b-4a4d-a181-4160baa50f9b'::uuid as categoria_destino_id,
    'e6d7187a-6d07-438d-a73a-5790173ca337'::uuid as equipo_destino_id
) ctx
where doc.categoria_id = ctx.categoria_origen_id
  and doc.equipo_id = ctx.equipo_origen_id
  and nullif(trim(coalesce(doc.storage_path, '')), '') is not null
  and nullif(trim(coalesce(doc.file_name, '')), '') is not null
  and not exists (
    select 1
    from public.team_documents existente
    where existente.categoria_id = ctx.categoria_destino_id
      and existente.equipo_id = ctx.equipo_destino_id
      and existente.requirement_id = doc.requirement_id
      and coalesce(existente.file_name, '') = coalesce(doc.file_name, '')
  );

-- Los documentos generales ausentes deben verse como pendientes en Delegados.
-- Esto crea los casilleros de seguro y lista de buena fe sin inventar archivos.
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

-- Resultado final de control.
select
  'GONNET_CLAUSURA_2026' as control,
  count(distinct pd.id) as jugadores,
  count(distinct pdoc.id) filter (where pdoc.storage_path is not null) as documentos_jugador_con_archivo,
  count(distinct tdoc.id) filter (where tdoc.storage_path is not null) as documentos_equipo_con_archivo
from (
  select
    '60445e76-630b-4a4d-a181-4160baa50f9b'::uuid as categoria_destino_id,
    'e6d7187a-6d07-438d-a73a-5790173ca337'::uuid as equipo_destino_id
) ctx
join public.team_players pd
  on pd.categoria_id = ctx.categoria_destino_id
 and pd.equipo_id = ctx.equipo_destino_id
 and pd.activo = true
left join public.player_documents pdoc on pdoc.player_id = pd.id
left join public.team_documents tdoc
  on tdoc.categoria_id = ctx.categoria_destino_id
 and tdoc.equipo_id = ctx.equipo_destino_id;
