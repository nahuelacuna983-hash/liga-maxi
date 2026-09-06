-- Verificacion de superficie publica sensible.
-- Solo lectura: no modifica datos, permisos ni politicas.
--
-- Objetivo:
-- Ver rapidamente que tablas, vistas y funciones sensibles siguen concedidas
-- a anon/authenticated.

with objetos_sensibles(nombre) as (
  values
    ('delegados'),
    ('delegado_categorias'),
    ('auditoria_resultados'),
    ('app_users'),
    ('app_user_permissions'),
    ('team_players'),
    ('player_documents'),
    ('player_document_events'),
    ('document_files'),
    ('document_events'),
    ('document_audit_results'),
    ('drive_player_documents'),
    ('v_team_documents_admin'),
    ('v_player_documents_admin'),
    ('v_drive_player_documents_admin'),
    ('v_document_audit_results_admin'),
    ('v_app_user_permissions'),
    ('app_usage_events')
)
select
  'TABLA_O_VISTA' as tipo,
  g.table_schema as schema,
  g.table_name as objeto,
  g.privilege_type as permiso,
  g.grantee as rol
from information_schema.role_table_grants g
join objetos_sensibles s on s.nombre = g.table_name
where g.table_schema in ('public', 'storage')
  and g.grantee in ('anon', 'authenticated')

union all

select
  'FUNCION' as tipo,
  r.routine_schema as schema,
  r.routine_name as objeto,
  r.privilege_type as permiso,
  r.grantee as rol
from information_schema.routine_privileges r
where r.routine_schema = 'public'
  and r.grantee in ('anon', 'authenticated')
  and r.routine_name in (
    'ensure_app_user',
    'set_user_permission',
    'add_team_player',
    'request_team_player_deactivation',
    'deactivate_team_player',
    'mark_player_document_uploaded',
    'review_player_document',
    'review_team_document',
    'review_drive_player_document',
    'create_player_from_drive_review',
    'add_team_document_file'
  )
order by tipo, objeto, rol, permiso;
