-- UNIVERSAL - CARGA V4
-- Abrir una consulta NUEVA en Supabase y ejecutar este archivo completo.

insert into public.team_players (
  organizacion_id, torneo_id, categoria_id, equipo_id, equipo_nombre,
  nombre, dni, activo, created_by, created_at, updated_at
)
select
  t.organizacion_id,
  t.id,
  c.id,
  e.id,
  'UNIVERSAL',
  lista.nombre,
  lista.dni,
  true,
  'importacion_administrativa_universal_2026',
  now(),
  now()
from (values
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
) as lista(nombre, dni)
join public.torneos t
  on lower(trim(t.nombre)) = lower('Clausura APdB')
join public.categorias c
  on c.torneo_id = t.id
 and lower(trim(c.nombre)) = lower('Maxi +35 A')
join public.equipos e
  on e.categoria_id = c.id
 and lower(trim(e.nombre)) = lower('UNIVERSAL')
where not exists (
  select 1
  from public.team_players existente
  where existente.categoria_id = c.id
    and existente.equipo_id = e.id
    and existente.activo = true
    and (
      regexp_replace(coalesce(existente.dni, ''), '\D', '', 'g') = lista.dni
      or lower(trim(existente.nombre)) = lower(lista.nombre)
    )
);

select public.ensure_player_documents(jugador.id)
from public.team_players jugador
join public.categorias categoria on categoria.id = jugador.categoria_id
join public.torneos torneo on torneo.id = jugador.torneo_id
where lower(trim(torneo.nombre)) = lower('Clausura APdB')
  and lower(trim(categoria.nombre)) = lower('Maxi +35 A')
  and lower(trim(jugador.equipo_nombre)) = lower('UNIVERSAL')
  and jugador.activo = true;

select
  count(distinct jugador.id) as jugadores_activos,
  count(distinct documento.id) as casilleros_documentales
from public.team_players jugador
left join public.player_documents documento on documento.player_id = jugador.id
join public.categorias categoria on categoria.id = jugador.categoria_id
join public.torneos torneo on torneo.id = jugador.torneo_id
where lower(trim(torneo.nombre)) = lower('Clausura APdB')
  and lower(trim(categoria.nombre)) = lower('Maxi +35 A')
  and lower(trim(jugador.equipo_nombre)) = lower('UNIVERSAL')
  and jugador.activo = true;

