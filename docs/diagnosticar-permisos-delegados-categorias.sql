-- Diagnostico de permisos de delegados vs categorias actuales
-- Ejecutar en Supabase SQL Editor.
-- No modifica datos.

with permisos as (
  select
    v.user_id,
    v.display_name,
    v.legacy_key,
    v.permission_id,
    v.torneo_id,
    v.torneo_nombre,
    v.categoria_id as permiso_categoria_id,
    v.categoria_nombre as permiso_categoria,
    v.equipo_id as permiso_equipo_id,
    v.equipo_nombre as permiso_equipo,
    v.can_view,
    v.can_load_results,
    v.can_load_documents
  from public.v_app_user_permissions v
  where v.role = 'delegado'
    and v.active = true
),
equipo_actual as (
  select
    e.id as equipo_id,
    e.nombre as equipo_nombre,
    e.categoria_id,
    c.nombre as categoria_nombre,
    c.torneo_id,
    t.nombre as torneo_nombre
  from public.equipos e
  join public.categorias c on c.id = e.categoria_id
  join public.torneos t on t.id = c.torneo_id
  where e.activo = true
),
comparacion as (
  select
    p.display_name,
    p.legacy_key,
    p.torneo_nombre,
    p.permiso_categoria,
    p.permiso_equipo,
    ea.categoria_nombre as categoria_actual_equipo,
    ea.equipo_id as equipo_actual_id,
    ea.categoria_id as categoria_actual_id,
    p.can_view,
    p.can_load_results,
    p.can_load_documents,
    case
      when ea.equipo_id is null then 'EQUIPO_NO_ENCONTRADO_ACTIVO'
      when p.permiso_categoria_id is distinct from ea.categoria_id then 'CATEGORIA_DESFASADA'
      when p.permiso_equipo_id is distinct from ea.equipo_id then 'EQUIPO_ID_DESFASADO'
      when not (p.can_view and p.can_load_results and p.can_load_documents) then 'PERMISOS_INCOMPLETOS'
      else 'OK'
    end as estado_permiso
  from permisos p
  left join equipo_actual ea
    on lower(ea.equipo_nombre) = lower(p.permiso_equipo)
   and ea.torneo_id = p.torneo_id
)
select *
from comparacion
where estado_permiso <> 'OK'
order by estado_permiso, permiso_equipo, legacy_key;

-- Resumen completo por delegado/equipo, incluso los OK.
with permisos as (
  select
    v.display_name,
    v.legacy_key,
    v.torneo_id,
    v.torneo_nombre,
    v.categoria_nombre as permiso_categoria,
    v.equipo_nombre as permiso_equipo,
    v.can_view,
    v.can_load_results,
    v.can_load_documents
  from public.v_app_user_permissions v
  where v.role = 'delegado'
    and v.active = true
),
equipo_actual as (
  select
    e.nombre as equipo_nombre,
    c.nombre as categoria_nombre,
    c.torneo_id
  from public.equipos e
  join public.categorias c on c.id = e.categoria_id
  where e.activo = true
)
select
  p.display_name,
  p.legacy_key,
  p.permiso_equipo,
  p.permiso_categoria,
  ea.categoria_nombre as categoria_actual_equipo,
  p.can_view,
  p.can_load_results,
  p.can_load_documents
from permisos p
left join equipo_actual ea
  on lower(ea.equipo_nombre) = lower(p.permiso_equipo)
 and ea.torneo_id = p.torneo_id
order by p.permiso_equipo, p.legacy_key, p.permiso_categoria;
