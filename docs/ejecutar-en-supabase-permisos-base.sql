-- APdB Liga Maxi - Base de usuarios, roles y permisos
-- Ejecutar completo en Supabase SQL Editor, en una consulta nueva.
--
-- Objetivo:
-- crear una estructura de permisos sin romper las claves actuales de la app.
-- Este paso no activa Supabase Auth todavia ni bloquea el sistema existente.
--
-- Roles:
-- admin_general: acceso total a la plataforma.
-- asociacion: administra una asociacion/torneo, con modo socorro.
-- delegado: gestiona equipos asignados.
-- jugador: acceso personal futuro.
-- publico: solo lectura futura.

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  organizacion_id uuid references public.organizaciones(id),
  display_name text not null,
  email text,
  role text not null,
  legacy_key text unique,
  active boolean not null default true,
  emergency_access boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_users_role_check
    check (role in ('admin_general', 'asociacion', 'delegado', 'jugador', 'publico'))
);

create table if not exists public.app_user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  organizacion_id uuid references public.organizaciones(id),
  torneo_id uuid references public.torneos(id),
  categoria_id uuid references public.categorias(id),
  equipo_id uuid references public.equipos(id),
  equipo_nombre text,
  can_view boolean not null default true,
  can_load_results boolean not null default false,
  can_load_documents boolean not null default false,
  can_review_documents boolean not null default false,
  can_correct_results boolean not null default false,
  can_manage_tournaments boolean not null default false,
  can_manage_users boolean not null default false,
  can_emergency_override boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_users_role
  on public.app_users(role);

create index if not exists idx_app_users_legacy_key
  on public.app_users(legacy_key);

create index if not exists idx_app_user_permissions_user
  on public.app_user_permissions(user_id);

create index if not exists idx_app_user_permissions_scope
  on public.app_user_permissions(organizacion_id, torneo_id, categoria_id, equipo_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_users_updated_at on public.app_users;

create trigger trg_app_users_updated_at
before update on public.app_users
for each row
execute function public.set_updated_at();

create or replace view public.v_app_user_permissions as
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
left join public.equipos e on e.id = aup.equipo_id;

create or replace function public.ensure_app_user(
  p_display_name text,
  p_role text,
  p_legacy_key text default null,
  p_email text default null,
  p_organizacion_id uuid default null,
  p_emergency_access boolean default false,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  insert into public.app_users (
    display_name,
    role,
    legacy_key,
    email,
    organizacion_id,
    emergency_access,
    notes
  )
  values (
    p_display_name,
    p_role,
    p_legacy_key,
    p_email,
    p_organizacion_id,
    p_emergency_access,
    p_notes
  )
  on conflict (legacy_key) do update
  set
    display_name = excluded.display_name,
    role = excluded.role,
    email = excluded.email,
    organizacion_id = excluded.organizacion_id,
    emergency_access = excluded.emergency_access,
    notes = excluded.notes,
    active = true
  returning id into v_user_id;

  return v_user_id;
end;
$$;

create or replace function public.set_user_permission(
  p_user_id uuid,
  p_organizacion_id uuid default null,
  p_torneo_id uuid default null,
  p_categoria_id uuid default null,
  p_equipo_id uuid default null,
  p_equipo_nombre text default null,
  p_can_view boolean default true,
  p_can_load_results boolean default false,
  p_can_load_documents boolean default false,
  p_can_review_documents boolean default false,
  p_can_correct_results boolean default false,
  p_can_manage_tournaments boolean default false,
  p_can_manage_users boolean default false,
  p_can_emergency_override boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_permission_id uuid;
begin
  insert into public.app_user_permissions (
    user_id,
    organizacion_id,
    torneo_id,
    categoria_id,
    equipo_id,
    equipo_nombre,
    can_view,
    can_load_results,
    can_load_documents,
    can_review_documents,
    can_correct_results,
    can_manage_tournaments,
    can_manage_users,
    can_emergency_override
  )
  values (
    p_user_id,
    p_organizacion_id,
    p_torneo_id,
    p_categoria_id,
    p_equipo_id,
    p_equipo_nombre,
    p_can_view,
    p_can_load_results,
    p_can_load_documents,
    p_can_review_documents,
    p_can_correct_results,
    p_can_manage_tournaments,
    p_can_manage_users,
    p_can_emergency_override
  )
  returning id into v_permission_id;

  return v_permission_id;
end;
$$;

grant execute on function public.ensure_app_user(text, text, text, text, uuid, boolean, text) to anon, authenticated;
grant execute on function public.set_user_permission(uuid, uuid, uuid, uuid, uuid, text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean) to anon, authenticated;

select
  'app_users' as tabla,
  count(*) as registros
from public.app_users
union all
select
  'app_user_permissions' as tabla,
  count(*) as registros
from public.app_user_permissions;
