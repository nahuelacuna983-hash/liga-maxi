-- APdB 2027: auditoría de permisos por catálogos, SIN datos personales.
-- Ejecutar con un usuario autorizado de lectura. No aplica DDL/DML.
-- El resultado identifica exposición potencial, no prueba explotabilidad.
BEGIN TRANSACTION READ ONLY;

-- 1. Tablas relevantes: RLS, grants reales anon/authenticated.
SELECT n.nspname AS esquema, c.relname AS objeto, c.relkind AS tipo,
       c.relrowsecurity AS rls_habilitada,
       c.relforcerowsecurity AS rls_forzada,
       has_table_privilege('anon', c.oid, 'SELECT') AS anon_select,
       has_table_privilege('anon', c.oid, 'INSERT') AS anon_insert,
       has_table_privilege('anon', c.oid, 'UPDATE') AS anon_update,
       has_table_privilege('anon', c.oid, 'DELETE') AS anon_delete,
       has_table_privilege('authenticated', c.oid, 'SELECT') AS auth_select,
       has_table_privilege('authenticated', c.oid, 'INSERT') AS auth_insert,
       has_table_privilege('authenticated', c.oid, 'UPDATE') AS auth_update,
       has_table_privilege('authenticated', c.oid, 'DELETE') AS auth_delete
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE (n.nspname = 'public' AND c.relname = ANY(ARRAY[
 'torneos','categorias','equipos','partidos','playoff_matches','match_schedules',
 'team_players','player_documents','team_documents','document_requirements',
 'app_users','app_user_permissions','delegados','delegado_categorias',
 'result_change_logs','auditoria_resultados']))
   OR (n.nspname = 'storage' AND c.relname = 'objects')
ORDER BY n.nspname, c.relname;

-- 2. Todas las políticas de las tablas sensibles, incluyendo sus expresiones.
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE (schemaname = 'public' AND tablename = ANY(ARRAY[
 'categorias','partidos','playoff_matches','match_schedules',
 'team_players','player_documents','team_documents','document_requirements',
 'app_users','app_user_permissions','delegados','delegado_categorias']))
   OR (schemaname = 'storage' AND tablename = 'objects')
ORDER BY schemaname, tablename, cmd, policyname;

-- 3. Funciones SECURITY DEFINER: ejecutabilidad efectiva y search_path.
SELECT n.nspname AS esquema, p.proname AS funcion,
       pg_get_function_identity_arguments(p.oid) AS argumentos,
       p.prosecdef AS security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_execute,
       COALESCE(array_to_string(p.proconfig, '; '), '') AS configuracion
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef
ORDER BY anon_execute DESC, p.proname;

-- 4. Vistas administrativas: SECURITY INVOKER y grants.
SELECT n.nspname AS esquema, c.relname AS vista,
       COALESCE((SELECT option_value FROM pg_options_to_table(c.reloptions)
                 WHERE option_name = 'security_invoker'), 'false') AS security_invoker,
       has_table_privilege('anon', c.oid, 'SELECT') AS anon_select,
       has_table_privilege('authenticated', c.oid, 'SELECT') AS auth_select
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'v'
  AND (c.relname LIKE 'v_%admin%' OR c.relname LIKE 'v_%permissions%')
ORDER BY c.relname;

-- 5. Bucket y configuración, sin listar objetos ni archivos.
SELECT id, name, public, file_size_limit
FROM storage.buckets WHERE id = 'documentos';

COMMIT;
