-- Gestor de Torneos - Vaciar fixtures de trabajo +35 A y +35 B
-- Copiar el contenido de este archivo en Supabase SQL Editor.
--
-- Objetivo:
-- - Permitir regenerar y publicar nuevamente los fixtures de Maxi +35 A y Maxi +35 B.
-- - Solo actua sobre el torneo Clausura APdB 2026.
-- - Solo borra partidos SIN resultados cargados.
-- - Si encuentra algun resultado cargado, corta con error y no borra nada.
--
-- No toca:
-- - torneo base anterior
-- - documentos
-- - permisos
-- - equipos
-- - categorias
-- - otras categorias del Clausura

begin;

do $$
declare
  v_torneo_id uuid;
  v_con_resultados integer;
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

  select count(*)
    into v_con_resultados
  from public.partidos p
  join public.categorias c on c.id = p.categoria_id
  where c.torneo_id = v_torneo_id
    and c.nombre in ('Maxi +35 A', 'Maxi +35 B')
    and (
      p.puntos_local is not null
      or p.puntos_visitante is not null
      or coalesce(p.estado_resultado, 'pendiente') <> 'pendiente'
    );

  if v_con_resultados > 0 then
    raise exception 'Limpieza bloqueada: hay % partido(s) con resultado o estado no pendiente.', v_con_resultados;
  end if;

  delete from public.partidos p
  using public.categorias c
  where p.categoria_id = c.id
    and c.torneo_id = v_torneo_id
    and c.nombre in ('Maxi +35 A', 'Maxi +35 B');

  get diagnostics v_borrados = row_count;
  raise notice 'Partidos borrados del Clausura +35 A/+35 B: %', v_borrados;
end $$;

select
  c.nombre as categoria,
  count(p.id) as partidos_restantes
from public.categorias c
left join public.partidos p on p.categoria_id = c.id
join public.torneos t on t.id = c.torneo_id
where t.nombre = 'Clausura APdB'
  and t.temporada = '2026'
  and c.nombre in ('Maxi +35 A', 'Maxi +35 B')
group by c.nombre
order by c.nombre;

commit;
