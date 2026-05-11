-- APdB Liga Maxi - Correccion jornadas Maxi +35 B
-- Ejecutar completo en Supabase SQL Editor, en una consulta nueva.
--
-- Problema:
-- Maxi +35 B quedo con jornadas 1, 2, 3, 5, 6, 7, 8, 9, 10.
-- La fecha suspendida por feriado no debe contar como jornada jugable.
--
-- Correccion:
-- Renumerar solamente Maxi +35 B:
-- 5 -> 4, 6 -> 5, 7 -> 6, 8 -> 7, 9 -> 8, 10 -> 9.
--
-- No toca resultados, equipos, documentos, claves ni otras categorias.

select
  jornada as jornada_actual,
  jornada - 1 as jornada_nueva,
  count(*) as partidos
from public.partidos
where categoria_id = '1f35934d-c6f5-412f-9eed-85244c202558'::uuid
  and jornada >= 5
group by jornada
order by jornada;

update public.partidos
set jornada = jornada - 1
where categoria_id = '1f35934d-c6f5-412f-9eed-85244c202558'::uuid
  and jornada >= 5;

select
  jornada,
  count(*) as partidos
from public.partidos
where categoria_id = '1f35934d-c6f5-412f-9eed-85244c202558'::uuid
group by jornada
order by jornada;
