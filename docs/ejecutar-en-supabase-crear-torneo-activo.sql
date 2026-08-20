-- Gestor de Torneos - Crear nuevo torneo activo sin copiar partidos
-- Copiar el contenido de este archivo en Supabase SQL Editor.
--
-- Objetivo:
-- - Crear un torneo nuevo para publicar fixtures nuevos.
-- - Copiar categorias y equipos del torneo anterior.
-- - NO copiar partidos, resultados, playoffs, documentacion cargada ni auditorias.
-- - Marcar como cerrado cualquier otro torneo activo de la misma organizacion.
--
-- Antes de ejecutar, ajustar estos tres valores si corresponde:
--   v_torneo_origen_id: torneo que tiene las categorias/equipos actuales.
--   v_nombre_nuevo: nombre visible del torneo nuevo.
--   v_temporada_nueva: temporada visible del torneo nuevo.

begin;

do $$
declare
  v_torneo_origen_id uuid := '7d0971e3-66ee-4791-bcbf-bace1d2fefb9'::uuid;
  v_nombre_nuevo text := 'Clausura APdB';
  v_temporada_nueva text := '2026';
  v_torneo_nuevo_id uuid;
  v_organizacion_id uuid;
begin
  select organizacion_id
    into v_organizacion_id
  from public.torneos
  where id = v_torneo_origen_id;

  if v_organizacion_id is null then
    raise exception 'No se encontro el torneo origen %', v_torneo_origen_id;
  end if;

  select id
    into v_torneo_nuevo_id
  from public.torneos
  where organizacion_id = v_organizacion_id
    and nombre = v_nombre_nuevo
    and temporada = v_temporada_nueva
  limit 1;

  if v_torneo_nuevo_id is null then
    insert into public.torneos (
      organizacion_id,
      nombre,
      temporada,
      tipo,
      estado
    )
    values (
      v_organizacion_id,
      v_nombre_nuevo,
      v_temporada_nueva,
      'liga',
      'activo'
    )
    returning id into v_torneo_nuevo_id;
  end if;

  update public.torneos
  set estado = 'cerrado'
  where organizacion_id = v_organizacion_id
    and estado = 'activo'
    and id <> v_torneo_nuevo_id;

  update public.torneos
  set estado = 'activo'
  where id = v_torneo_nuevo_id;

  insert into public.categorias (
    torneo_id,
    nombre,
    estado,
    formato,
    playoffs,
    clasificados,
    dia_juego,
    fecha_inicio,
    fecha_fin,
    frecuencia,
    fechas_bloqueadas,
    series_playoff
  )
  select
    v_torneo_nuevo_id,
    c.nombre,
    c.estado,
    c.formato,
    c.playoffs,
    c.clasificados,
    c.dia_juego,
    null,
    null,
    c.frecuencia,
    coalesce(c.fechas_bloqueadas, '{}'),
    coalesce(c.series_playoff, '{}'::jsonb)
  from public.categorias c
  where c.torneo_id = v_torneo_origen_id
    and not exists (
      select 1
      from public.categorias existente
      where existente.torneo_id = v_torneo_nuevo_id
        and existente.nombre = c.nombre
    );

  insert into public.equipos (
    categoria_id,
    nombre,
    orden_inicial,
    activo
  )
  select
    categoria_nueva.id,
    e.nombre,
    e.orden_inicial,
    e.activo
  from public.equipos e
  join public.categorias categoria_origen
    on categoria_origen.id = e.categoria_id
  join public.categorias categoria_nueva
    on categoria_nueva.torneo_id = v_torneo_nuevo_id
   and categoria_nueva.nombre = categoria_origen.nombre
  where categoria_origen.torneo_id = v_torneo_origen_id
    and e.activo = true
    and not exists (
      select 1
      from public.equipos existente
      where existente.categoria_id = categoria_nueva.id
        and existente.nombre = e.nombre
    );

  raise notice 'Torneo activo listo: %', v_torneo_nuevo_id;
end $$;

select
  t.id as torneo_id,
  t.nombre,
  t.temporada,
  t.estado,
  count(distinct c.id) as categorias,
  count(e.id) as equipos
from public.torneos t
left join public.categorias c on c.torneo_id = t.id
left join public.equipos e on e.categoria_id = c.id and e.activo = true
where t.estado = 'activo'
group by t.id, t.nombre, t.temporada, t.estado;

commit;
