-- APdB Liga Maxi - Correccion ascensos/descensos Clausura 2026
-- Ejecutar en Supabase SQL Editor.
--
-- Objetivo:
-- Alinear equipos y permisos de delegados segun las categorias oficiales del Clausura:
-- - TOLOSANO: Maxi +35 B
-- - HOGAR SOCIAL: Maxi +35 B
-- - ESTUDIANTES: Maxi +35 A
-- - ESTRELLA DE BERISSO: Maxi +35 A
--
-- No toca partidos, resultados, fixtures ni tablas de posiciones.

do $$
declare
  v_org_id uuid;
  v_torneo_id uuid;
  v_cat_35a uuid;
  v_cat_35b uuid;
  v_record record;
  v_user_id uuid;
  v_equipo_id uuid;
begin
  select id
  into v_org_id
  from public.organizaciones
  where slug = 'apdb'
  limit 1;

  select id
  into v_torneo_id
  from public.torneos
  where estado = 'activo'
  order by created_at desc
  limit 1;

  if v_org_id is null then
    raise exception 'No se encontro organizacion APdB';
  end if;

  if v_torneo_id is null then
    raise exception 'No se encontro torneo activo';
  end if;

  select id into v_cat_35a
  from public.categorias
  where torneo_id = v_torneo_id
    and nombre = 'Maxi +35 A'
  limit 1;

  select id into v_cat_35b
  from public.categorias
  where torneo_id = v_torneo_id
    and nombre = 'Maxi +35 B'
  limit 1;

  if v_cat_35a is null or v_cat_35b is null then
    raise exception 'No se encontraron categorias Maxi +35 A y Maxi +35 B para el torneo activo';
  end if;

  for v_record in
    select *
    from (
      values
        ('tolosano123', 'TOLOSANO', 'Maxi +35 B', v_cat_35b),
        ('hogar123', 'HOGAR SOCIAL', 'Maxi +35 B', v_cat_35b),
        ('estudiantes123', 'ESTUDIANTES', 'Maxi +35 A', v_cat_35a),
        ('estrella123', 'ESTRELLA DE BERISSO', 'Maxi +35 A', v_cat_35a)
    ) as cambios(legacy_key, equipo_nombre, categoria_nombre, categoria_id)
  loop
    update public.equipos
    set categoria_id = v_record.categoria_id
    where nombre = v_record.equipo_nombre
      and activo = true
      and categoria_id in (v_cat_35a, v_cat_35b);

    select id
    into v_equipo_id
    from public.equipos
    where nombre = v_record.equipo_nombre
      and categoria_id = v_record.categoria_id
      and activo = true
    limit 1;

    if v_equipo_id is null then
      raise notice 'No se encontro equipo activo % en % despues de actualizar', v_record.equipo_nombre, v_record.categoria_nombre;
      continue;
    end if;

    update public.team_players
    set categoria_id = v_record.categoria_id,
        equipo_id = v_equipo_id
    where equipo_nombre = v_record.equipo_nombre
      and categoria_id in (v_cat_35a, v_cat_35b);

    update public.player_documents
    set categoria_id = v_record.categoria_id,
        equipo_id = v_equipo_id
    where equipo_nombre = v_record.equipo_nombre
      and categoria_id in (v_cat_35a, v_cat_35b);

    update public.team_documents
    set categoria_id = v_record.categoria_id,
        equipo_id = v_equipo_id
    where equipo_nombre = v_record.equipo_nombre
      and categoria_id in (v_cat_35a, v_cat_35b);

    update public.drive_player_documents
    set categoria_id = v_record.categoria_id,
        match_status = case
          when match_status = 'exacto' then 'dudoso'
          else match_status
        end,
        observation = trim(concat(coalesce(observation, ''), ' Reasignado por cambio de categoria Clausura 2026. Revisar vinculacion de jugador.'))
    where equipo_nombre = v_record.equipo_nombre
      and categoria_id in (v_cat_35a, v_cat_35b)
      and player_name is not null;

    select id
    into v_user_id
    from public.app_users
    where legacy_key = v_record.legacy_key
    limit 1;

    if v_user_id is null then
      raise notice 'No existe usuario delegado %', v_record.legacy_key;
      continue;
    end if;

    delete from public.app_user_permissions
    where user_id = v_user_id
      and torneo_id = v_torneo_id
      and equipo_nombre = v_record.equipo_nombre
      and categoria_id in (v_cat_35a, v_cat_35b);

    insert into public.app_user_permissions (
      user_id,
      organizacion_id,
      torneo_id,
      categoria_id,
      equipo_id,
      equipo_nombre,
      can_view,
      can_load_results,
      can_load_documents
    )
    values (
      v_user_id,
      v_org_id,
      v_torneo_id,
      v_record.categoria_id,
      v_equipo_id,
      v_record.equipo_nombre,
      true,
      true,
      true
    );
  end loop;
end;
$$;

select
  c.nombre as categoria,
  e.nombre as equipo,
  e.activo
from public.equipos e
join public.categorias c on c.id = e.categoria_id
join public.torneos t on t.id = c.torneo_id
where t.estado = 'activo'
  and c.nombre in ('Maxi +35 A', 'Maxi +35 B')
  and e.nombre in ('TOLOSANO', 'HOGAR SOCIAL', 'ESTUDIANTES', 'ESTRELLA DE BERISSO')
order by c.nombre, e.nombre;

select
  display_name,
  legacy_key,
  categoria_nombre,
  equipo_nombre,
  can_view,
  can_load_results,
  can_load_documents
from public.v_app_user_permissions
where legacy_key in ('tolosano123', 'hogar123', 'estudiantes123', 'estrella123')
order by legacy_key, categoria_nombre;
