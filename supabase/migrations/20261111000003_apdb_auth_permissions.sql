-- Expose only the active permission rows of the authenticated app user.
-- This is required by app_online.js after Supabase Auth sign-in.
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
stable
set search_path = public, auth
as $$
  select
    v.user_id,
    v.display_name,
    v.email,
    v.role,
    v.legacy_key,
    v.active,
    v.emergency_access,
    v.permission_id,
    v.organizacion_id,
    v.organizacion_nombre,
    v.torneo_id,
    v.torneo_nombre,
    v.categoria_id,
    v.categoria_nombre,
    v.equipo_id,
    v.equipo_nombre,
    v.can_view,
    v.can_load_results,
    v.can_load_documents,
    v.can_review_documents,
    v.can_correct_results,
    v.can_manage_tournaments,
    v.can_manage_users,
    v.can_emergency_override
  from public.v_app_user_permissions v
  join public.app_users u on u.id = v.user_id
  where u.auth_user_id = auth.uid()
    and u.active
    and (v.permission_id is null or exists (
      select 1
      from public.app_user_permissions p
      where p.id = v.permission_id
        and p.user_id = u.id
    ));
$$;

revoke all on function public.get_current_app_user_permissions() from public, anon;
grant execute on function public.get_current_app_user_permissions() to authenticated;
