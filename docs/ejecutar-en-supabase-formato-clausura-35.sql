-- Liga Maxi / APdB
-- Reparacion de metadata deportiva para Clausura APdB 2026.
--
-- Objetivo:
-- - Dejar Maxi +35 A y Maxi +35 B con el mismo formato de playoffs.
-- - No borra partidos.
-- - No toca resultados.
-- - No publica fixtures nuevos.
-- - No modifica delegados, documentacion ni claves.
--
-- Contexto:
-- Los fixtures ya publicados quedaron con partidos reales en Supabase,
-- pero la categoria no tenia guardado el formato deportivo elegido.
-- Este SQL completa esa metadata para que la app no dependa de reglas viejas
-- por nombre de categoria.

begin;

with torneo_objetivo as (
  select id
  from public.torneos
  where nombre = 'Clausura APdB'
    and temporada = '2026'
  order by created_at desc
  limit 1
),
categorias_objetivo as (
  select c.id, c.nombre
  from public.categorias c
  join torneo_objetivo t on t.id = c.torneo_id
  where c.nombre in ('Maxi +35 A', 'Maxi +35 B')
)
update public.categorias c
set
  estado = 'publicada',
  formato = 'Top 8',
  playoffs = true,
  clasificados = 8,
  dia_juego = 0,
  fecha_inicio = (
    select min(p.fecha)
    from public.partidos p
    where p.categoria_id = c.id
  ),
  fecha_fin = (
    select max(p.fecha)
    from public.partidos p
    where p.categoria_id = c.id
  ),
  frecuencia = 1,
  series_playoff = '{
    "cuartos": {
      "partidos": 1,
      "fecha": null,
      "fechas": []
    },
    "semifinales": {
      "partidos": 1,
      "fecha": null,
      "fechas": []
    },
    "final": {
      "partidos": 3,
      "fecha": null,
      "fechas": []
    }
  }'::jsonb
from categorias_objetivo co
where c.id = co.id;

select
  c.nombre,
  c.estado,
  c.formato,
  c.playoffs,
  c.clasificados,
  c.fecha_inicio,
  c.fecha_fin,
  c.series_playoff
from public.categorias c
join torneo_objetivo t on t.id = c.torneo_id
where c.nombre in ('Maxi +35 A', 'Maxi +35 B')
order by c.nombre;

commit;
