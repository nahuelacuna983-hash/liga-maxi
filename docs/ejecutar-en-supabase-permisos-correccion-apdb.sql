-- APdB Liga Maxi - Correccion de permisos por nombres historicos
-- Ejecutar despues de permisos-base y permisos-seed.
--
-- No toca equipos, partidos, resultados ni documentos.
-- Solo ajusta permisos de usuarios para reflejar lo que ya permite la app actual.

do $$
declare
  v_org_id uuid;
  v_torneo_id uuid := '7d0971e3-66ee-4791-bcbf-bace1d2fefb9'::uuid;
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

  for v_record in
    select *
    from (
      values
        ('universal123', 'Maxi +35 A', 'UNIVERSAL'),
        ('universal123', 'Femenino', 'UNIVERSAL'),
        ('meridiano123', 'Maxi +35 A', 'MERIDIANO V'),
        ('meridiano123', 'Maxi +48', 'MERIDIANO V'),
        ('union123', 'Maxi +35 A', 'UNON VECINAL'),
        ('vsc123', 'Maxi +35 A', 'VILLA SAN CARLOS'),
        ('vsc123', 'Maxi +48', 'VILLA SAN CARLOS'),
        ('banco123', 'Maxi +35 A', 'BANCO PROVINCIA'),
        ('unlp123', 'Maxi +35 A', 'U.N.L.P'),
        ('tolosano123', 'Maxi +35 A', 'TOLOSANO'),
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
    where legacy_key = v_record.legacy_key;

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
    limit 1;

    if v_user_id is not null and v_categoria_id is not null then
      delete from public.app_user_permissions
      where user_id = v_user_id
        and categoria_id = v_categoria_id
        and coalesce(equipo_nombre, '') = v_record.equipo_nombre;

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
    end if;
  end loop;
end;
$$;

select
  display_name,
  legacy_key,
  categoria_nombre,
  equipo_nombre,
  can_load_results,
  can_load_documents
from public.v_app_user_permissions
where role = 'delegado'
order by display_name, categoria_nombre, equipo_nombre;
