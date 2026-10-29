-- Propuesta reversible para una base/branch aislada. NO fue ejecutada.
-- No habilita escritura de fixtures desde clientes: esa operación debe usar un
-- flujo administrativo/RPC revisado por separado.

create or replace function public.cargar_resultado_partido(
  p_partido_id uuid,
  p_puntos_local integer,
  p_puntos_visitante integer,
  p_cargado_por text default null
)
returns public.partidos
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_partido public.partidos;
  v_autorizado boolean;
begin
  if p_puntos_local is null or p_puntos_visitante is null
     or p_puntos_local < 0 or p_puntos_visitante < 0
     or p_puntos_local = p_puntos_visitante then
    raise exception 'Marcador normal invalido';
  end if;

  select p.* into v_partido
  from public.partidos p
  where p.id = p_partido_id;

  if not found then
    raise exception 'Partido inexistente';
  end if;

  select exists (
    select 1
    from public.app_user_permissions permission
    join public.categorias category on category.id = v_partido.categoria_id
    left join public.equipos home_team
      on home_team.categoria_id = v_partido.categoria_id
     and lower(home_team.nombre) = lower(v_partido.local)
    left join public.equipos away_team
      on away_team.categoria_id = v_partido.categoria_id
     and lower(away_team.nombre) = lower(v_partido.visitante)
    where permission.user_id = (select auth.uid())
      and permission.categoria_id = v_partido.categoria_id
      and permission.torneo_id = category.torneo_id
      and (
        (permission.can_correct_results and permission.equipo_id is null)
        or (permission.can_load_results and permission.equipo_id in (home_team.id, away_team.id))
        or (permission.can_correct_results and permission.equipo_id in (home_team.id, away_team.id))
      )
  ) into v_autorizado;

  if not v_autorizado then
    raise exception 'Usuario sin permiso para este partido';
  end if;

  update public.partidos
  set puntos_local = p_puntos_local,
      puntos_visitante = p_puntos_visitante,
      estado_resultado = 'jugado',
      cargado_por = p_cargado_por,
      cargado_en = now()
  where id = p_partido_id
  returning * into v_partido;

  return v_partido;
end;
$$;

revoke all on function public.cargar_resultado_partido(uuid, integer, integer, text)
  from public, anon, authenticated;
grant execute on function public.cargar_resultado_partido(uuid, integer, integer, text)
  to authenticated;

-- El cliente solo puede cambiar los campos de resultado, nunca equipos,
-- categoría, torneo, fecha, fase u otra metadata del partido.
revoke insert, update, delete on public.partidos from public, anon, authenticated;
grant update (puntos_local, puntos_visitante, estado_resultado, cargado_por, cargado_en)
  on public.partidos to authenticated;

drop policy if exists "partidos escritura app" on public.partidos;
drop policy if exists "partidos update app" on public.partidos;

create policy "partidos update por alcance"
on public.partidos
for update
to authenticated
using (
  exists (
    select 1
    from public.app_user_permissions p
    join public.categorias c on c.id = partidos.categoria_id
    left join public.equipos e_local
      on e_local.categoria_id = partidos.categoria_id
     and lower(e_local.nombre) = lower(partidos.local)
    left join public.equipos e_visitante
      on e_visitante.categoria_id = partidos.categoria_id
     and lower(e_visitante.nombre) = lower(partidos.visitante)
    where p.user_id = (select auth.uid())
      and p.categoria_id = partidos.categoria_id
      and p.torneo_id = c.torneo_id
      and (
        (p.can_correct_results and p.equipo_id is null)
        or (p.can_load_results and p.equipo_id in (e_local.id, e_visitante.id))
        or (p.can_correct_results and p.equipo_id in (e_local.id, e_visitante.id))
      )
  )
)
with check (
  exists (
    select 1
    from public.app_user_permissions p
    join public.categorias c on c.id = partidos.categoria_id
    left join public.equipos e_local
      on e_local.categoria_id = partidos.categoria_id
     and lower(e_local.nombre) = lower(partidos.local)
    left join public.equipos e_visitante
      on e_visitante.categoria_id = partidos.categoria_id
     and lower(e_visitante.nombre) = lower(partidos.visitante)
    where p.user_id = (select auth.uid())
      and p.categoria_id = partidos.categoria_id
      and p.torneo_id = c.torneo_id
      and (
        (p.can_correct_results and p.equipo_id is null)
        or (p.can_load_results and p.equipo_id in (e_local.id, e_visitante.id))
        or (p.can_correct_results and p.equipo_id in (e_local.id, e_visitante.id))
      )
  )
);

-- Un usuario no puede crear, editar ni eliminar su propia autorización.
revoke insert, update, delete on public.app_user_permissions from public, anon, authenticated;
grant select on public.app_user_permissions to authenticated;
drop policy if exists "app permissions own read" on public.app_user_permissions;
create policy "app permissions own read"
on public.app_user_permissions
for select
to authenticated
using (user_id = (select auth.uid()));

-- Las tablas de delegados son administradas por el backend/proceso de
-- administración, no por el navegador del delegado.
revoke insert, update, delete on public.delegados, public.delegado_categorias, public.equipos
  from public, anon, authenticated;
