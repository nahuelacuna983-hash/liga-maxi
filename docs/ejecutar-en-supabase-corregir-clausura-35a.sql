-- Gestor de Torneos - Correccion puntual Clausura Maxi +35 A
-- Copiar el contenido de este archivo en Supabase SQL Editor.
--
-- Corrige solamente el torneo Clausura APdB 2026:
-- 1) Maxi +35 A - Fecha 8 pasa de domingo 18/10/2026 a sabado 17/10/2026.
-- 2) Corrige el texto UNON VECINAL por UNION VECINAL en los partidos publicados.
--
-- No toca resultados, documentos, equipos, permisos ni otras categorias.

begin;

do $$
declare
  v_torneo_id uuid;
  v_categoria_id uuid;
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
    and nombre = 'Maxi +35 A'
  limit 1;

  if v_categoria_id is null then
    raise exception 'No se encontro la categoria Maxi +35 A del Clausura.';
  end if;

  update public.partidos
  set fecha = '2026-10-17'::date,
      updated_at = now()
  where categoria_id = v_categoria_id
    and jornada = 8;

  update public.partidos
  set local = 'UNION VECINAL',
      updated_at = now()
  where categoria_id = v_categoria_id
    and local = 'UNON VECINAL';

  update public.partidos
  set visitante = 'UNION VECINAL',
      updated_at = now()
  where categoria_id = v_categoria_id
    and visitante = 'UNON VECINAL';
end $$;

select
  p.jornada,
  p.fecha,
  p.local,
  p.visitante
from public.partidos p
join public.categorias c on c.id = p.categoria_id
join public.torneos t on t.id = c.torneo_id
where t.nombre = 'Clausura APdB'
  and t.temporada = '2026'
  and c.nombre = 'Maxi +35 A'
  and (
    p.jornada = 8
    or p.local ilike '%UNON%'
    or p.visitante ilike '%UNON%'
    or p.local = 'UNION VECINAL'
    or p.visitante = 'UNION VECINAL'
  )
order by p.jornada, p.local, p.visitante;

commit;
