-- APdB 2027: catálogo de metadatos exclusivamente de lectura.
-- Ejecutar sólo con una identidad autorizada contra un clon/staging Supabase.
-- No devuelve filas de aplicación, auth.users ni contenidos de Storage.
\set ON_ERROR_STOP on

select current_database() as database_name,
       current_setting('server_version') as server_version;

-- Tablas referenciadas por app_online.js y fuentes documentales.
select n.nspname as schema_name, c.relname as object_name,
       c.relkind, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'storage')
  and c.relname = any(array[
    'organizaciones','torneos','categorias','equipos','fechas','partidos',
    'playoff_matches','match_schedules','team_players','player_documents',
    'player_document_events','team_documents','document_events',
    'document_requirements','document_files','app_users',
    'app_user_permissions','document_audit_results','document_ai_audits',
    'drive_player_documents','app_usage_events','result_change_logs',
    'objects','buckets'
  ]::text[])
order by 1, 2;

-- Columnas y restricciones, sin leer datos.
select table_schema, table_name, column_name, data_type, udt_name,
       is_nullable, column_default
from information_schema.columns
where (table_schema = 'public' and table_name = any(array[
  'organizaciones','torneos','categorias','equipos','fechas','partidos',
  'playoff_matches','match_schedules','team_players','player_documents',
  'player_document_events','team_documents','document_events',
  'document_requirements','document_files','app_users',
  'app_user_permissions','document_audit_results','document_ai_audits',
  'drive_player_documents','app_usage_events','result_change_logs'
]::text[]))
   or (table_schema = 'storage' and table_name in ('objects','buckets'))
order by table_schema, table_name, ordinal_position;

select tc.table_schema, tc.table_name, tc.constraint_name,
       tc.constraint_type, kcu.column_name,
       ccu.table_schema as foreign_schema, ccu.table_name as foreign_table,
       ccu.column_name as foreign_column
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on kcu.constraint_schema = tc.constraint_schema
 and kcu.constraint_name = tc.constraint_name
left join information_schema.constraint_column_usage ccu
  on ccu.constraint_schema = tc.constraint_schema
 and ccu.constraint_name = tc.constraint_name
where tc.table_schema in ('public','storage')
  and tc.table_name = any(array[
    'organizaciones','torneos','categorias','equipos','fechas','partidos',
    'playoff_matches','match_schedules','team_players','player_documents',
    'team_documents','document_requirements','document_files','app_users',
    'app_user_permissions','objects','buckets'
  ]::text[])
order by tc.table_schema, tc.table_name, tc.constraint_name;

-- Políticas, grants y funciones relevantes. Las expresiones se recuperan como
-- metadatos de seguridad, nunca como datos de negocio.
select schemaname, tablename, policyname, permissive, roles, cmd,
       qual, with_check
from pg_policies
where schemaname in ('public','storage')
order by schemaname, tablename, policyname;

select routine_schema, routine_name, routine_type, data_type,
       security_type, external_language
from information_schema.routines
where routine_schema in ('public','storage')
order by routine_schema, routine_name;

select n.nspname as schema_name, p.proname,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,
       coalesce(array_to_string(p.proconfig, ','), '') as config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public','storage')
order by n.nspname, p.proname;

select table_schema, table_name, privilege_type, grantee
from information_schema.role_table_grants
where table_schema in ('public','storage')
  and grantee in ('anon','authenticated')
order by table_schema, table_name, grantee, privilege_type;

select routine_schema, routine_name, privilege_type, grantee
from information_schema.routine_privileges
where routine_schema in ('public','storage')
  and grantee in ('anon','authenticated')
order by routine_schema, routine_name, grantee, privilege_type;

-- Sólo metadatos de buckets: no nombres de objetos ni archivos.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'documentos';
