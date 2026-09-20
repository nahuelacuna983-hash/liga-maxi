-- APdB Clausura 2026 - Requisitos documentales para Maxi +35 B y Maxi +48.
-- Configuracion general reutilizable por todos los equipos de ambas categorias.
-- No modifica fixtures, partidos, resultados ni posiciones.

begin;

with categorias(categoria_id) as (
  values
    ('60445e76-630b-4a4d-a181-4160baa50f9b'::uuid),
    ('5d53b667-3228-40ff-9eb3-c2dc8c870aad'::uuid)
),
requisitos(nombre, descripcion, obligatorio, requiere_vencimiento, scope, allows_multiple_files) as (
  values
    ('Certificado medico y estudio complementario', 'Certificado medico y estudio complementario por jugador.', true, true, 'player', false),
    ('Declaracion jurada', 'Declaracion jurada de deslinde de responsabilidad por jugador.', true, false, 'player', false),
    ('Pase', 'Pase o autorizacion administrativa. No bloquea habilitacion general.', false, false, 'player', false),
    ('Lista de buena fe', 'Nomina oficial del equipo con sello o recibido APdB.', true, false, 'team', false),
    ('Seguro', 'Poliza o certificado y nomina completa de jugadores.', true, true, 'team', false)
)
insert into public.document_requirements (
  organizacion_id, torneo_id, categoria_id, nombre, descripcion,
  obligatorio, requiere_vencimiento, activo, scope, allows_multiple_files
)
select
  '4fc0ec74-71d3-43cc-9509-f788aceaedf1'::uuid,
  '21676aa8-5587-489f-b0e7-0808aff25de4'::uuid,
  c.categoria_id,
  r.nombre,
  r.descripcion,
  r.obligatorio,
  r.requiere_vencimiento,
  true,
  r.scope,
  r.allows_multiple_files
from categorias c
cross join requisitos r
where not exists (
  select 1
  from public.document_requirements existente
  where existente.organizacion_id = '4fc0ec74-71d3-43cc-9509-f788aceaedf1'::uuid
    and existente.torneo_id = '21676aa8-5587-489f-b0e7-0808aff25de4'::uuid
    and existente.categoria_id = c.categoria_id
    and lower(trim(existente.nombre)) = lower(trim(r.nombre))
    and existente.scope = r.scope
);

-- Casilleros individuales para todos los jugadores ya cargados en ambas categorias.
select public.ensure_player_documents(p.id)
from public.team_players p
where p.torneo_id = '21676aa8-5587-489f-b0e7-0808aff25de4'::uuid
  and p.categoria_id in (
    '60445e76-630b-4a4d-a181-4160baa50f9b'::uuid,
    '5d53b667-3228-40ff-9eb3-c2dc8c870aad'::uuid
  )
  and p.activo = true;

-- Casilleros generales para todos los equipos de ambas categorias.
insert into public.team_documents (
  requirement_id, organizacion_id, torneo_id, categoria_id,
  equipo_id, equipo_nombre, status, observacion
)
select
  r.id,
  r.organizacion_id,
  r.torneo_id,
  r.categoria_id,
  e.id,
  e.nombre,
  'pendiente',
  'Pendiente de carga.'
from public.document_requirements r
join public.equipos e on e.categoria_id = r.categoria_id
where r.torneo_id = '21676aa8-5587-489f-b0e7-0808aff25de4'::uuid
  and r.categoria_id in (
    '60445e76-630b-4a4d-a181-4160baa50f9b'::uuid,
    '5d53b667-3228-40ff-9eb3-c2dc8c870aad'::uuid
  )
  and r.scope = 'team'
  and r.activo = true
  and not exists (
    select 1
    from public.team_documents td
    where td.requirement_id = r.id
      and td.torneo_id = r.torneo_id
      and td.categoria_id = r.categoria_id
      and td.equipo_id = e.id
  );

commit;

select
  c.nombre as categoria,
  count(distinct p.id) filter (where p.activo) as jugadores_activos,
  count(pd.id) as casilleros_jugador,
  count(distinct td.id) as casilleros_equipo
from public.categorias c
left join public.team_players p
  on p.categoria_id = c.id
 and p.torneo_id = c.torneo_id
left join public.player_documents pd on pd.player_id = p.id
left join public.team_documents td on td.categoria_id = c.id
where c.torneo_id = '21676aa8-5587-489f-b0e7-0808aff25de4'::uuid
  and c.id in (
    '60445e76-630b-4a4d-a181-4160baa50f9b'::uuid,
    '5d53b667-3228-40ff-9eb3-c2dc8c870aad'::uuid
  )
group by c.nombre
order by c.nombre;
