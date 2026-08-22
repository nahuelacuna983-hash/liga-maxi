-- Liga Maxi / APdB
-- Reparacion de formato de playoffs para Clausura APdB 2026.
--
-- Este SQL NO borra partidos.
-- Este SQL NO toca resultados.
-- Este SQL NO cambia equipos ni fechas de fase regular.
--
-- Solo completa/corrige la configuracion deportiva de las llaves:
-- - Maxi +35 A: Top 8
-- - Maxi +35 B: Top 8
-- - Maxi +48: Top 6

begin;

with torneo_objetivo as (
  select id
  from public.torneos
  where nombre = 'Clausura APdB'
    and temporada = '2026'
    and estado = 'activo'
  order by created_at desc
  limit 1
)
update public.categorias c
set
  estado = 'publicada',
  formato = 'Top 8',
  playoffs = true,
  clasificados = 8,
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
from torneo_objetivo t
where c.torneo_id = t.id
  and c.nombre in ('Maxi +35 A', 'Maxi +35 B');

with torneo_objetivo as (
  select id
  from public.torneos
  where nombre = 'Clausura APdB'
    and temporada = '2026'
    and estado = 'activo'
  order by created_at desc
  limit 1
)
update public.categorias c
set
  estado = 'publicada',
  formato = 'Top 6',
  playoffs = true,
  clasificados = 6,
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
  series_playoff = '{
    "clasificacion": {
      "partidos": 1,
      "fecha": "2026-10-14",
      "fechas": ["2026-10-14"]
    },
    "repechaje": {
      "partidos": 1,
      "fecha": "2026-10-14",
      "fechas": ["2026-10-14"]
    },
    "semifinales": {
      "partidos": 1,
      "fecha": "2026-10-21",
      "fechas": ["2026-10-21"]
    },
    "final": {
      "partidos": 3,
      "fecha": "2026-10-28",
      "fechas": ["2026-10-28", "2026-11-04", "2026-11-11"]
    }
  }'::jsonb
from torneo_objetivo t
where c.torneo_id = t.id
  and c.nombre = 'Maxi +48';

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
join public.torneos t on t.id = c.torneo_id
where t.nombre = 'Clausura APdB'
  and t.temporada = '2026'
  and t.estado = 'activo'
  and c.nombre in ('Maxi +35 A', 'Maxi +35 B', 'Maxi +48')
order by c.nombre;

commit;
