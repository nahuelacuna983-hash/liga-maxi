-- APdB Liga Maxi - Carga inicial completa del plantel de UNIVERSAL
-- Fuente: UNIVERSAL HABILITADOS.xlsx (Drive APdB, revisada 17/09/2026).
--
-- Alcance de este paso:
--   1) carga 23 jugadores en Clausura APdB 2026 / Maxi +35 A / UNIVERSAL;
--   2) evita duplicados por DNI y, como respaldo, por nombre normalizado;
--   3) crea los casilleros documentales pendientes para cada jugador.
--
-- No carga a Guido Martinez: tiene carpeta documental pero no figura en la
-- nomina fuente. Debe resolverse desde revision administrativa.

with
src(nombre, dni) as (
  values
    ('Busto Ignacio Agustin', '35073296'),
    ('Castro Alejandro Emmanuel', '35017453'),
    ('Ferrari Matias Sebastian', '28273586'),
    ('Marquis Andres', '33845868'),
    ('Accoce Lucas', '32844204'),
    ('Yoyce Emmanuel Santiago', '35179964'),
    ('Oliva Gardella Lucas Adrian', '34609019'),
    ('Bielevich Emiliano Daniel', '32393346'),
    ('Accoce Agustin', '35611383'),
    ('Vita Martin Sebastian', '24363591'),
    ('Vita Juan Ignacio', '29371184'),
    ('Murlo Facundo Matias', '28868073'),
    ('Stringa Pablo', '28345972'),
    ('Rodriguez Damian', '26654140'),
    ('Accoce Matias', '30728838'),
    ('Milanesi Nahuel', '25312449'),
    ('Pagano Sebastian Jesus', '22139419'),
    ('Fiorenza Pablo', '29558971'),
    ('Guerrica Ramiro', '32609888'),
    ('Rotela Francisco Nicolas', '32843993'),
    ('Garavento Leonardo', '29307950'),
    ('Lopez Adrian', '32998849'),
    ('Olguin Esteban', '28768029')
),
ctx as (
  select
    t.organizacion_id,
    t.id as torneo_id,
    c.id as categoria_id,
    e.id as equipo_id
  from public.torneos t
  join public.categorias c on c.torneo_id = t.id
  join public.equipos e on e.categoria_id = c.id
  where lower(trim(t.nombre)) = lower('Clausura APdB')
    and lower(trim(c.nombre)) = lower('Maxi +35 A')
    and lower(trim(e.nombre)) = lower('UNIVERSAL')
  limit 1
)
insert into public.team_players (
  organizacion_id,
  torneo_id,
  categoria_id,
  equipo_id,
  equipo_nombre,
  nombre,
  dni,
  activo,
  created_by,
  created_at,
  updated_at
)
select
  ctx.organizacion_id,
  ctx.torneo_id,
  ctx.categoria_id,
  ctx.equipo_id,
  'UNIVERSAL',
  src.nombre,
  src.dni,
  true,
  'importacion_administrativa_universal_2026',
  now(),
  now()
from src
cross join ctx
where not exists (
  select 1
  from public.team_players p
  where p.categoria_id = ctx.categoria_id
    and p.equipo_id = ctx.equipo_id
    and p.activo = true
    and (
      regexp_replace(coalesce(p.dni, ''), '\D', '', 'g') = src.dni
      or lower(trim(p.nombre)) = lower(src.nombre)
    )
);

-- Genera los requisitos pendientes para jugadores nuevos y ya existentes.
select public.ensure_player_documents(p.id)
from public.team_players p
join public.categorias c on c.id = p.categoria_id
join public.torneos t on t.id = p.torneo_id
where lower(trim(t.nombre)) = lower('Clausura APdB')
  and lower(trim(c.nombre)) = lower('Maxi +35 A')
  and lower(trim(p.equipo_nombre)) = lower('UNIVERSAL')
  and p.activo = true;

select
  p.equipo_nombre as equipo,
  count(*) filter (where p.activo) as jugadores_activos,
  count(*) filter (where p.activo and nullif(trim(coalesce(p.dni, '')), '') is not null) as con_dni,
  count(pd.id) as casilleros_documentales
from public.team_players p
left join public.player_documents pd on pd.player_id = p.id
join public.categorias c on c.id = p.categoria_id
join public.torneos t on t.id = p.torneo_id
where lower(trim(t.nombre)) = lower('Clausura APdB')
  and lower(trim(c.nombre)) = lower('Maxi +35 A')
  and lower(trim(p.equipo_nombre)) = lower('UNIVERSAL')
group by p.equipo_nombre;
