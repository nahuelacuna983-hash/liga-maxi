-- Propuesta reversible para una base/branch aislada. NO fue ejecutada.
-- No habilita escritura de fixtures desde clientes: esa operación debe usar un
-- flujo administrativo/RPC revisado por separado.

drop function if exists public.cargar_resultado_partido(uuid, integer, integer, text);

create or replace function public.cargar_resultado_partido(
  p_partido_id uuid,
  p_puntos_local integer,
  p_puntos_visitante integer
)
returns public.partidos
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_partido public.partidos;
  v_categoria public.categorias;
  v_torneo public.torneos;
  v_autorizado boolean;
  v_puede_corregir boolean;
begin
  if p_puntos_local is null or p_puntos_visitante is null
     or p_puntos_local < 0 or p_puntos_visitante < 0
     or p_puntos_local = p_puntos_visitante then
    raise exception 'Marcador normal invalido';
  end if;

  select p.* into v_partido
  from public.partidos p
  where p.id = p_partido_id
  for update;

  if not found then
    raise exception 'Partido inexistente';
  end if;

  select c.* into v_categoria
  from public.categorias c
  where c.id = v_partido.categoria_id;
  select t.* into v_torneo
  from public.torneos t
  where t.id = v_categoria.torneo_id;

  if v_categoria.estado not in ('publicada', 'activa') or v_torneo.estado <> 'activo' then
    raise exception 'Categoria o torneo bloqueado';
  end if;

  if v_partido.fecha is not null and exists (
    select 1
    from jsonb_array_elements_text(coalesce(v_categoria.fechas_bloqueadas, '[]'::jsonb)) blocked_date
    where blocked_date = v_partido.fecha::text
  ) then
    raise exception 'Fecha bloqueada';
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

  select exists (
    select 1
    from public.app_user_permissions permission
    left join public.equipos home_team
      on home_team.categoria_id = v_partido.categoria_id
     and lower(home_team.nombre) = lower(v_partido.local)
    left join public.equipos away_team
      on away_team.categoria_id = v_partido.categoria_id
     and lower(away_team.nombre) = lower(v_partido.visitante)
    where permission.user_id = (select auth.uid())
      and permission.torneo_id = v_categoria.torneo_id
      and permission.categoria_id = v_partido.categoria_id
      and permission.can_correct_results
      and (permission.equipo_id is null or permission.equipo_id in (home_team.id, away_team.id))
  ) into v_puede_corregir;

  if v_partido.estado_resultado is not null
     and v_partido.estado_resultado <> 'pendiente'
     and not v_puede_corregir then
    raise exception 'Se requiere permiso de correccion';
  end if;

  if not v_autorizado then
    raise exception 'Usuario sin permiso para este partido';
  end if;

  update public.partidos
  set puntos_local = p_puntos_local,
      puntos_visitante = p_puntos_visitante,
      estado_resultado = 'jugado',
      cargado_por = coalesce((select auth.jwt() ->> 'email'), (select auth.uid())::text),
      cargado_en = now()
  where id = p_partido_id
  returning * into v_partido;

  return v_partido;
end;
$$;

revoke all on function public.cargar_resultado_partido(uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.cargar_resultado_partido(uuid, integer, integer)
  to authenticated;

create or replace function public.publicar_fixture_categoria(
  p_categoria_id uuid,
  p_partidos jsonb,
  p_configuracion jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_categoria public.categorias%rowtype;
  v_torneo public.torneos%rowtype;
  v_autorizado boolean;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesion autenticada';
  end if;

  select c.* into v_categoria from public.categorias c
  where c.id = p_categoria_id for update;
  if not found then raise exception 'Categoria inexistente'; end if;

  select t.* into v_torneo from public.torneos t where t.id = v_categoria.torneo_id;
  if not found or coalesce(v_torneo.estado, '') <> 'activo' then
    raise exception 'El torneo no esta activo';
  end if;

  select exists (
    select 1 from public.app_user_permissions p
    where p.user_id = auth.uid()
      and p.torneo_id = v_categoria.torneo_id
      and p.categoria_id is null
      and p.equipo_id is null
      and p.can_manage_tournaments is true
  ) into v_autorizado;
  if not v_autorizado then
    raise exception 'El usuario no tiene permiso para publicar fixtures';
  end if;

  if jsonb_typeof(p_partidos) <> 'array' or jsonb_array_length(p_partidos) = 0 then
    raise exception 'El fixture debe contener al menos un partido';
  end if;
  if jsonb_array_length(p_partidos) > 500 then
    raise exception 'El fixture supera el limite de partidos';
  end if;
  if coalesce(p_configuracion->>'estado', 'publicada') not in ('publicada', 'activa') then
    raise exception 'Estado de categoria no permitido';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_partidos) as x(local text, visitante text, jornada integer, fecha date, libre text)
    where nullif(btrim(x.local), '') is null
       or nullif(btrim(x.visitante), '') is null
       or lower(btrim(x.local)) = lower(btrim(x.visitante))
       or x.jornada is null
       or x.jornada < 1
  ) then
    raise exception 'El fixture contiene partido invalido';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_partidos) as x(local text, visitante text, jornada integer, fecha date, libre text)
    where not exists (
      select 1 from public.equipos e
      where e.categoria_id = p_categoria_id and lower(e.nombre) = lower(btrim(x.local))
    )
       or not exists (
      select 1 from public.equipos e
      where e.categoria_id = p_categoria_id and lower(e.nombre) = lower(btrim(x.visitante))
    )
       or (x.libre is not null and not exists (
      select 1 from public.equipos e
      where e.categoria_id = p_categoria_id and lower(e.nombre) = lower(btrim(x.libre))
    ))
  ) then
    raise exception 'El fixture contiene equipos fuera de la categoria';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_partidos) as x(local text, visitante text, jornada integer, fecha date, libre text)
    group by x.jornada, least(lower(btrim(x.local)), lower(btrim(x.visitante))), greatest(lower(btrim(x.local)), lower(btrim(x.visitante)))
    having count(*) > 1
  ) then
    raise exception 'El fixture contiene parejas duplicadas';
  end if;
  if exists (
    select 1 from (
      select x.jornada, lower(btrim(x.local)) as equipo from jsonb_to_recordset(p_partidos) as x(local text, visitante text, jornada integer, fecha date, libre text)
      union all
      select x.jornada, lower(btrim(x.visitante)) from jsonb_to_recordset(p_partidos) as x(local text, visitante text, jornada integer, fecha date, libre text)
      union all
      select x.jornada, lower(btrim(x.libre)) from jsonb_to_recordset(p_partidos) as x(local text, visitante text, jornada integer, fecha date, libre text) where x.libre is not null
    ) teams_per_round
    group by jornada, equipo
    having count(*) > 1
  ) then
    raise exception 'El fixture repite un equipo en la misma jornada';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_partidos) as x(local text, visitante text, jornada integer, fecha date, libre text)
    where x.fecha is not null and exists (
      select 1 from jsonb_array_elements_text(
        coalesce(p_configuracion->'fechas_bloqueadas', v_categoria.fechas_bloqueadas, '[]'::jsonb)
      ) blocked_date
      where blocked_date = x.fecha::text
    )
  ) then
    raise exception 'El fixture usa una fecha bloqueada';
  end if;
  if exists (select 1 from public.partidos where categoria_id = p_categoria_id) then
    raise exception 'La categoria ya tiene partidos cargados';
  end if;

  insert into public.partidos (
    categoria_id, local, visitante, jornada, fecha, libre,
    puntos_local, puntos_visitante, estado_resultado, cargado_por, cargado_en
  )
  select p_categoria_id, x.local, x.visitante, x.jornada, x.fecha, x.libre,
         null, null, 'pendiente', coalesce(auth.jwt()->>'email', auth.uid()::text), now()
  from jsonb_to_recordset(p_partidos) as x(
    local text, visitante text, jornada integer, fecha date, libre text
  );

  update public.categorias
  set estado = coalesce(p_configuracion->>'estado', 'publicada'),
      formato = p_configuracion->>'formato',
      playoffs = coalesce((p_configuracion->>'playoffs')::boolean, false),
      clasificados = nullif(p_configuracion->>'clasificados', '')::integer,
      dia_juego = nullif(p_configuracion->>'dia_juego', '')::integer,
      fecha_inicio = nullif(p_configuracion->>'fecha_inicio', '')::date,
      fecha_fin = nullif(p_configuracion->>'fecha_fin', '')::date,
      frecuencia = nullif(p_configuracion->>'frecuencia', '')::integer,
      fechas_bloqueadas = coalesce(p_configuracion->'fechas_bloqueadas', '[]'::jsonb),
      series_playoff = p_configuracion->'series_playoff'
  where id = p_categoria_id;
end;
$$;

revoke all on function public.publicar_fixture_categoria(uuid, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.publicar_fixture_categoria(uuid, jsonb, jsonb)
  to authenticated;

-- El cliente solo puede cambiar los campos de resultado, nunca equipos,
-- categoría, torneo, fecha, fase u otra metadata del partido.
revoke insert, update, delete on public.partidos from public, anon, authenticated;

drop policy if exists "partidos escritura app" on public.partidos;
drop policy if exists "partidos update app" on public.partidos;
drop policy if exists "partidos update por alcance" on public.partidos;

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
