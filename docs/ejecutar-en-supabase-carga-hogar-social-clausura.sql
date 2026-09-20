-- APdB Liga Maxi - Carga inicial completa de HOGAR SOCIAL.
-- Fuente: listas de buena fe APdB del 04/09/2026 (+48) y 25/08/2026 (+35).
-- La lista rotulada +35 A se carga en la categoria vigente Maxi +35 B.
-- Un jugador que integra ambas listas conserva una inscripcion por categoria.

begin;

with src(categoria, nombre, dni) as (
  values
    ('Maxi +35 B', 'Banegas German Ezequiel', '31743726'),
    ('Maxi +35 B', 'Bordoni Juan Pablo', '27023189'),
    ('Maxi +35 B', 'Campos Juan Manuel', '32467676'),
    ('Maxi +35 B', 'Campuris Federico Javier', '25887590'),
    ('Maxi +35 B', 'Chappa Matias Raul', '31783729'),
    ('Maxi +35 B', 'Cortinez Lisandro', '29772648'),
    ('Maxi +35 B', 'Gallosi Emiliano', '32982449'),
    ('Maxi +35 B', 'Gallosi Leandro Nicolas', '31956507'),
    ('Maxi +35 B', 'Lopez Fernando Rodrigo', '29683902'),
    ('Maxi +35 B', 'Luciano Guillermo', '24245435'),
    ('Maxi +35 B', 'Marziflak Cristian Alejandro', '33551644'),
    ('Maxi +35 B', 'Miglio Luis Sebastian', '31940738'),
    ('Maxi +35 B', 'Ocampo Matias Ezequiel', '27901450'),
    ('Maxi +35 B', 'Ocampo Maximiliano Norman Gabriel', '25635937'),
    ('Maxi +35 B', 'Ojeda Cristian Daniel', '24835560'),
    ('Maxi +35 B', 'Ortigoza Gustavo Ariel', '26864897'),
    ('Maxi +35 B', 'Rainski Carlos Alberto', '33506047'),
    ('Maxi +35 B', 'Rigo Rafael Jorge', '29558291'),
    ('Maxi +35 B', 'Robador Daniel Ismael', '22956400'),
    ('Maxi +35 B', 'Rosa Diego', '21544387'),
    ('Maxi +35 B', 'Santos Jorge Ariel', '24999309'),
    ('Maxi +35 B', 'Trejo Diego Sebastian', '23620467'),
    ('Maxi +35 B', 'Vargas Jorge Alberto', '29764992'),
    ('Maxi +35 B', 'Wanionok Catriel Lautaro', '34789852'),
    ('Maxi +35 B', 'Wanionok Nahuel', '33640026'),
    ('Maxi +48', 'Bordoni Juan Pablo', '27023189'),
    ('Maxi +48', 'Campuris Federico Javier', '25887590'),
    ('Maxi +48', 'De Los Santos Pablo Emiliano', '23343259'),
    ('Maxi +48', 'Garavaglia Carlos Andres', '25690564'),
    ('Maxi +48', 'Lombardo Juan', '20525972'),
    ('Maxi +48', 'Luciano Guillermo', '24245435'),
    ('Maxi +48', 'Ocampo Matias Ezequiel', '27901450'),
    ('Maxi +48', 'Ocampo Maximiliano Norman Gabriel', '25635937'),
    ('Maxi +48', 'Ochoa De La Maza Juan Martin', '25458592'),
    ('Maxi +48', 'Ojeda Cristian Daniel', '24835560'),
    ('Maxi +48', 'Ortigoza Gustavo Ariel', '26864897'),
    ('Maxi +48', 'Robador Daniel Ismael', '22956400'),
    ('Maxi +48', 'Rosa Diego', '21544387'),
    ('Maxi +48', 'Rosa Marcelo', '23485407'),
    ('Maxi +48', 'Santori Hernan', '26803847'),
    ('Maxi +48', 'Santos Jorge Ariel', '24999309'),
    ('Maxi +48', 'Surila Fernando Adrian', '24256176'),
    ('Maxi +48', 'Tolosa Omar', '16300635'),
    ('Maxi +48', 'Trejo Diego Sebastian', '23620467'),
    ('Maxi +48', 'Vega Hector Jose', '23599563'),
    ('Maxi +48', 'Villa Santiago Andres', '22669746')
),
ctx as (
  select *
  from (
    values
      (
        '4fc0ec74-71d3-43cc-9509-f788aceaedf1'::uuid,
        '21676aa8-5587-489f-b0e7-0808aff25de4'::uuid,
        '60445e76-630b-4a4d-a181-4160baa50f9b'::uuid,
        'Maxi +35 B'::text,
        'f6d3f2cc-8802-4deb-9490-3e0765d68253'::uuid
      ),
      (
        '4fc0ec74-71d3-43cc-9509-f788aceaedf1'::uuid,
        '21676aa8-5587-489f-b0e7-0808aff25de4'::uuid,
        '5d53b667-3228-40ff-9eb3-c2dc8c870aad'::uuid,
        'Maxi +48'::text,
        '01244e5b-0687-438b-b5e5-3e6b2a99cfc6'::uuid
      )
  ) as fixed_ctx(organizacion_id, torneo_id, categoria_id, categoria, equipo_id)
)
insert into public.team_players (
  organizacion_id, torneo_id, categoria_id, equipo_id, equipo_nombre,
  nombre, dni, activo, created_by, created_at, updated_at
)
select
  ctx.organizacion_id,
  ctx.torneo_id,
  ctx.categoria_id,
  ctx.equipo_id,
  'HOGAR SOCIAL',
  src.nombre,
  src.dni,
  true,
  'importacion_administrativa_hogar_social_2026',
  now(),
  now()
from src
join ctx on ctx.categoria = src.categoria
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

select public.ensure_player_documents(p.id)
from public.team_players p
join public.categorias c on c.id = p.categoria_id
join public.torneos t on t.id = p.torneo_id
where lower(trim(t.nombre)) = lower('Clausura APdB')
  and c.nombre in ('Maxi +35 B', 'Maxi +48')
  and lower(trim(p.equipo_nombre)) = lower('HOGAR SOCIAL')
  and p.activo = true;

commit;

select
  c.nombre as categoria,
  count(distinct p.id) filter (where p.activo) as jugadores_activos,
  count(pd.id) as casilleros_documentales
from public.team_players p
join public.categorias c on c.id = p.categoria_id
join public.torneos t on t.id = p.torneo_id
left join public.player_documents pd on pd.player_id = p.id
where lower(trim(t.nombre)) = lower('Clausura APdB')
  and c.nombre in ('Maxi +35 B', 'Maxi +48')
  and lower(trim(p.equipo_nombre)) = lower('HOGAR SOCIAL')
group by c.nombre
order by c.nombre;
