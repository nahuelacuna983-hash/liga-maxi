-- Gestor de Torneos - Login real con Supabase Auth
-- Ejecutar despues de:
-- 1) docs/ejecutar-en-supabase-permisos-base.sql
-- 2) docs/ejecutar-en-supabase-permisos-seed-apdb.sql
--
-- Objetivo:
-- permitir que la app lea permisos del usuario autenticado por email/password
-- sin eliminar todavia las claves legacy actuales.

create or replace function public.get_current_app_user_permissions()
returns table (
  user_id uuid,
  display_name text,
  email text,
  role text,
  legacy_key text,
  active boolean,
  emergency_access boolean,
  permission_id uuid,
  organizacion_id uuid,
  organizacion_nombre text,
  torneo_id uuid,
  torneo_nombre text,
  categoria_id uuid,
  categoria_nombre text,
  equipo_id uuid,
  equipo_nombre text,
  can_view boolean,
  can_load_results boolean,
  can_load_documents boolean,
  can_review_documents boolean,
  can_correct_results boolean,
  can_manage_tournaments boolean,
  can_manage_users boolean,
  can_emergency_override boolean
)
language sql
security definer
set search_path = public
as $$
  select
    au.id as user_id,
    au.display_name,
    au.email,
    au.role,
    au.legacy_key,
    au.active,
    au.emergency_access,
    aup.id as permission_id,
    aup.organizacion_id,
    o.nombre as organizacion_nombre,
    aup.torneo_id,
    t.nombre as torneo_nombre,
    aup.categoria_id,
    c.nombre as categoria_nombre,
    aup.equipo_id,
    coalesce(e.nombre, aup.equipo_nombre) as equipo_nombre,
    aup.can_view,
    aup.can_load_results,
    aup.can_load_documents,
    aup.can_review_documents,
    aup.can_correct_results,
    aup.can_manage_tournaments,
    aup.can_manage_users,
    aup.can_emergency_override
  from public.app_users au
  left join public.app_user_permissions aup on aup.user_id = au.id
  left join public.organizaciones o on o.id = aup.organizacion_id
  left join public.torneos t on t.id = aup.torneo_id
  left join public.categorias c on c.id = aup.categoria_id
  left join public.equipos e on e.id = aup.equipo_id
  where au.auth_user_id = auth.uid()
    and au.active = true;
$$;

grant execute on function public.get_current_app_user_permissions() to authenticated;

-- Vincular un usuario de Auth con app_users:
-- 1. Crear el usuario en Authentication > Users.
-- 2. Copiar su UUID.
-- 3. Ejecutar:
--
-- update public.app_users
-- set auth_user_id = 'UUID_DEL_USUARIO_AUTH',
--     email = 'mail@ejemplo.com'
-- where legacy_key = 'clave_actual';

