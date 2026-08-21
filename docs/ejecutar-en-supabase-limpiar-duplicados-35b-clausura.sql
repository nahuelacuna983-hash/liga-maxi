-- Gestor de Torneos - Limpiar duplicados Maxi +35 B Clausura APdB 2026
-- Copiar el contenido de este archivo en Supabase SQL Editor.
--
-- Objetivo:
-- - Dejar un solo registro por partido duplicado exacto en Maxi +35 B del Clausura.
-- - Conserva el primer registro creado de cada cruce.
-- - Solo actua sobre el torneo Clausura APdB 2026 y la categoria Maxi +35 B.
-- - Si detecta cualquier resultado cargado en esa categoria, corta con error y no borra nada.
--
-- No toca:
-- - Maxi +35 A
-- - torneo anterior
-- - documentos
-- - playoffs
-- - permisos
-- - otras categorias

begin;

do $$
declare
  v_torneo_id uuid;
  v_categoria_id uuid;
  v_con_resultados integer;
  v_duplicados integer;
  v_borrados integer;
begin
  select id
    into v_torneo_id
  from public.torneos
  where nombre = 'Clausura APdB'
    and temporada = '2026'
  order by created_at desc
  limit 1;

  if v_torneo_id is null then
    raise exception 'No se encontro el torneo Clausura APdB 2026.';
  end if;

  select id
    into v_categoria_id
  from public.categorias
  where torneo_id = v_torneo_id
    and nombre = 'Maxi +35 B'
  limit 1;

  if v_categoria_id is null then
    raise exception 'No se encontro la categoria Maxi +35 B del Clausura.';
  end if;

  select count(*)
    into v_con_resultados
  from public.partidos
  where categoria_id = v_categoria_id
    and (
      puntos_local is not null
      or puntos_visitante is not null
      or coalesce(estado_resultado, 'pendiente') <> 'pendiente'
    );

  if v_con_resultados > 0 then
    raise exception 'Limpieza bloqueada: Maxi +35 B tiene % partido(s) con resultado o estado no pendiente.', v_con_resultados;
  end if;

  with numerados as (
    select
      id,
      row_number() over (
        partition by categoria_id, jornada, fecha, local, visitante, coalesce(libre, '')
        order by created_at asc, id asc
      ) as rn
    from public.partidos
    where categoria_id = v_categoria_id
  )
  select count(*)
    into v_duplicados
  from numerados
  where rn > 1;

  if v_duplicados = 0 then
    raise notice 'No se encontraron duplicados en Maxi +35 B Clausura.';
  else
    with numerados as (
      select
        id,
        row_number() over (
          partition by categoria_id, jornada, fecha, local, visitante, coalesce(libre, '')
          order by created_at asc, id asc
        ) as rn
      from public.partidos
      where categoria_id = v_categoria_id
    )
    delete from public.partidos p
    using numerados n
    where p.id = n.id
      and n.rn > 1;

    get diagnostics v_borrados = row_count;
    raise notice 'Duplicados borrados en Maxi +35 B Clausura: %', v_borrados;
  end if;
end $$;

select
  c.nombre as categoria,
  count(p.id) as partidos,
  count(distinct p.jornada) as fechas,
  count(*) filter (
    where p.puntos_local is not null
       or p.puntos_visitante is not null
       or coalesce(p.estado_resultado, 'pendiente') <> 'pendiente'
  ) as partidos_con_resultado
from public.categorias c
left join public.partidos p on p.categoria_id = c.id
join public.torneos t on t.id = c.torneo_id
where t.nombre = 'Clausura APdB'
  and t.temporada = '2026'
  and c.nombre in ('Maxi +35 A', 'Maxi +35 B')
group by c.nombre
order by c.nombre;

commit;
