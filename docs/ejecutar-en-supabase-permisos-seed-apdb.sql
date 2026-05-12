-- APdB Liga Maxi - Carga inicial de usuarios y permisos APdB
-- Ejecutar despues de: ejecutar-en-supabase-permisos-base.sql
--
-- Este archivo refleja las claves actuales en tablas de permisos.
-- No elimina ni cambia las claves hardcodeadas de la app todavia.

do $$
declare
  v_org_id uuid;
  v_torneo_id uuid := '7d0971e3-66ee-4791-bcbf-bace1d2fefb9'::uuid;
  v_admin_id uuid;
  v_asociacion_id uuid;
  v_user_id uuid;
  v_record record;
begin
  select id
  into v_org_id
  from public.organizaciones
  where slug = 'apdb'
  limit 1;

  if v_org_id is null then
    raise exception 'No se encontro organizacion APdB';
  end if;

  v_admin_id := public.ensure_app_user(
    'ADMIN GENERAL',
    'admin_general',
    'admin123',
    null,
    v_org_id,
    true,
    'Superusuario inicial. Acceso total.'
  );

  delete from public.app_user_permissions where user_id = v_admin_id;

  perform public.set_user_permission(
    v_admin_id,
    v_org_id,
    v_torneo_id,
    null,
    null,
    null,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true
  );

  v_asociacion_id := public.ensure_app_user(
    'ASOCIACION APdB',
    'asociacion',
    'asociacion123',
    null,
    v_org_id,
    true,
    'Usuario administrativo de Asociacion con modo socorro.'
  );

  delete from public.app_user_permissions where user_id = v_asociacion_id;

  perform public.set_user_permission(
    v_asociacion_id,
    v_org_id,
    v_torneo_id,
    null,
    null,
    null,
    true,
    false,
    false,
    true,
    true,
    true,
    false,
    true
  );

  for v_record in
    select *
    from (
      values
        ('universal123', 'UNIVERSAL', 'UNIVERSAL'),
        ('meridiano123', 'MERIDIANO V', 'MERIDIANO V'),
        ('union123', 'UNION VECINAL', 'UNION VECINAL'),
        ('vsc123', 'VILLA SAN CARLOS', 'VILLA SAN CARLOS'),
        ('banco123', 'BANCO PROVINCIA', 'BANCO PROVINCIA'),
        ('unlp123', 'U.N.L.P.', 'U.N.L.P.'),
        ('tolosano123', 'TOLOSANO', 'TOLOSANO'),
        ('mayo123', 'MAYO', 'MAYO'),
        ('hogar123', 'HOGAR SOCIAL', 'HOGAR SOCIAL'),
        ('sud123', 'SUD AMERICA', 'SUD AMERICA'),
        ('gonnet123', 'GONNET', 'GONNET'),
        ('estudiantes123', 'ESTUDIANTES', 'ESTUDIANTES'),
        ('max123', 'MAX NORDAU', 'MAX NORDAU'),
        ('hornos123', 'LOS HORNOS', 'LOS HORNOS'),
        ('reconquista123', 'RECONQUISTA', 'RECONQUISTA'),
        ('juventud123', 'JUVENTUD', 'JUVENTUD'),
        ('estrella123', 'ESTRELLA DE BERISSO', 'ESTRELLA DE BERISSO'),
        ('macabi123', 'MACABI', 'MACABI'),
        ('unidos123', 'UNIDOS DEL DIQUE', 'UNIDOS DEL DIQUE'),
        ('velisa123', 'VILLA ELISA', 'VILLA ELISA'),
        ('platense123', 'PLATENSE', 'PLATENSE'),
        ('astillerofem123', 'ASTILLERO', 'ASTILLERO'),
        ('estrellafem123', 'ESTRELLA DE BERISSO FEM', 'ESTRELLA DE BERISSO'),
        ('sanvicentefem123', 'SAN VICENTE', 'SAN VICENTE')
    ) as seed(legacy_key, display_name, equipo_nombre)
  loop
    v_user_id := public.ensure_app_user(
      v_record.display_name,
      'delegado',
      v_record.legacy_key,
      null,
      v_org_id,
      false,
      'Delegado migrado desde clave actual.'
    );

    delete from public.app_user_permissions where user_id = v_user_id;

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
    select
      v_user_id,
      v_org_id,
      v_torneo_id,
      c.id,
      e.id,
      e.nombre,
      true,
      true,
      true
    from public.equipos e
    join public.categorias c on c.id = e.categoria_id
    where e.activo = true
      and e.nombre = v_record.equipo_nombre
      and c.torneo_id = v_torneo_id;
  end loop;
end;
$$;

select
  role,
  count(*) as usuarios
from public.app_users
group by role
order by role;

select
  display_name,
  role,
  legacy_key,
  active,
  emergency_access
from public.app_users
order by role, display_name;
