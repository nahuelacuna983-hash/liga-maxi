-- APdB Liga Maxi - Permisos delegados Clausura 2026
-- Ejecutar en Supabase SQL Editor.
--
-- Objetivo:
-- actualizar permisos de delegados segun las categorias actuales.
-- No toca partidos, resultados, fixtures, documentos ni jugadores.
--
-- Importante:
-- Este archivo reemplaza correcciones historicas del Apertura.

do $$
declare
  v_org_id uuid;
  v_torneo_id uuid;
  v_user_id uuid;
  v_categoria_id uuid;
  v_equipo_id uuid;
  v_record record;
begin
  select id
  into v_org_id
  from public.organizaciones
  where slug = 'apdb'
  limit 1;

  select id
  into v_torneo_id
  from public.torneos
  order by created_at desc
  limit 1;

  if v_org_id is null then
    raise exception 'No se encontro organizacion APdB';
  end if;

  if v_torneo_id is null then
    raise exception 'No se encontro torneo actual';
  end if;

  for v_record in
    select *
    from (
      values
        ('universal123', 'Maxi +35 A', 'UNIVERSAL'),
        ('universal123', 'Femenino', 'UNIVERSAL'),
        ('meridiano123', 'Maxi +35 A', 'MERIDIANO V'),
        ('meridiano123', 'Maxi +48', 'MERIDIANO V'),
        ('union123', 'Maxi +35 A', 'UNION VECINAL'),
        ('vsc123', 'Maxi +35 A', 'VILLA SAN CARLOS'),
        ('vsc123', 'Maxi +48', 'VILLA SAN CARLOS'),
        ('banco123', 'Maxi +35 A', 'BANCO PROVINCIA'),
        ('unlp123', 'Maxi +35 A', 'U.N.L.P.'),
        ('tolosano123', 'Maxi +35 B', 'TOLOSANO'),
        ('mayo123', 'Maxi +35 A', 'MAYO'),
        ('hogar123', 'Maxi +35 A', 'HOGAR SOCIAL'),
        ('hogar123', 'Maxi +48', 'HOGAR SOCIAL'),
        ('hogar123', 'Femenino', 'HOGAR SOCIAL'),
        ('sud123', 'Maxi +35 A', 'SUD AMERICA'),
        ('gonnet123', 'Maxi +35 B', 'GONNET'),
        ('gonnet123', 'Femenino', 'GONNET'),
        ('estudiantes123', 'Maxi +35 B', 'ESTUDIANTES'),
        ('estudiantes123', 'Maxi +48', 'ESTUDIANTES'),
        ('max123', 'Maxi +35 B', 'MAX NORDAU'),
        ('max123', 'Femenino', 'MAX NORDAU'),
        ('hornos123', 'Maxi +35 B', 'LOS HORNOS'),
        ('reconquista123', 'Maxi +35 B', 'RECONQUISTA'),
        ('juventud123', 'Maxi +35 B', 'JUVENTUD'),
        ('juventud123', 'Maxi +48', 'JUVENTUD'),
        ('estrella123', 'Maxi +35 B', 'ESTRELLA DE BERISSO'),
        ('macabi123', 'Maxi +35 B', 'MACABI'),
        ('macabi123', 'Femenino', 'MACABI'),
        ('unidos123', 'Maxi +35 B', 'UNIDOS DEL DIQUE'),
        ('velisa123', 'Maxi +35 B', 'VILLA ELISA'),
        ('velisa123', 'Maxi +48', 'VILLA ELISA'),
        ('platense123', 'Maxi +48', 'PLATENSE'),
        ('platense123', 'Femenino', 'PLATENSE'),
        ('astillerofem123', 'Femenino', 'ASTILLERO'),
        ('estrellafem123', 'Femenino', 'ESTRELLA DE BERISSO'),
        ('sanvicentefem123', 'Femenino', 'SAN VICENTE')
    ) as seed(legacy_key, categoria_nombre, equipo_nombre)
  loop
    select id
    into v_user_id
    from public.app_users
    where legacy_key = v_record.legacy_key
    limit 1;

    select id
    into v_categoria_id
    from public.categorias
    where torneo_id = v_torneo_id
      and nombre = v_record.categoria_nombre
    limit 1;

    select e.id
    into v_equipo_id
    from public.equipos e
    where e.categoria_id = v_categoria_id
      and e.nombre = v_record.equipo_nombre
      and e.activo = true
    limit 1;

    if v_user_id is null then
      raise notice 'No existe usuario %', v_record.legacy_key;
      continue;
    end if;

    if v_categoria_id is null then
      raise notice 'No existe categoria % en torneo %', v_record.categoria_nombre, v_torneo_id;
      continue;
    end if;

    if v_equipo_id is null then
      raise notice 'No existe equipo activo % en %', v_record.equipo_nombre, v_record.categoria_nombre;
      continue;
    end if;

    delete from public.app_user_permissions
    where user_id = v_user_id
      and torneo_id = v_torneo_id
      and (
        lower(coalesce(equipo_nombre, '')) = lower(v_record.equipo_nombre)
        or equipo_id = v_equipo_id
      );

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
      v_categoria_id,
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
  display_name,
  legacy_key,
  categoria_nombre,
  equipo_nombre,
  can_view,
  can_load_results,
  can_load_documents
from public.v_app_user_permissions
where role = 'delegado'
order by equipo_nombre, legacy_key, categoria_nombre;
