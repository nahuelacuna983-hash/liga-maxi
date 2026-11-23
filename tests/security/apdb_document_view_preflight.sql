-- APdB 2027 / Bloque 4: preflight SOLO LECTURA.
-- Ejecutar con psql sobre entorno DESCARTABLE o staging autorizado para inspección.
-- No consulta filas de jugadores ni documentos y no cambia esquema ni datos.
-- Estado esperado previo al parche: contract_ready=false.
WITH objects AS (
  SELECT c.oid,c.relname,c.relkind,c.relrowsecurity,c.reloptions,
         has_table_privilege('authenticated',c.oid,'SELECT') AS auth_select,
         has_table_privilege('anon',c.oid,'SELECT') AS anon_select
  FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public'
    AND c.relname IN ('v_team_documents_admin','v_player_documents_admin',
                      'team_documents','document_requirements')
), policy_counts AS (
  SELECT tablename,count(*) AS policy_count
  FROM pg_policies
  WHERE schemaname='public' AND tablename IN ('team_documents','document_requirements')
  GROUP BY tablename
)
SELECT o.relname AS object_name,o.relkind,o.relrowsecurity,
       o.reloptions, o.auth_select,o.anon_select,
       coalesce(p.policy_count,0) AS policy_count,
       CASE
         WHEN o.relname='v_team_documents_admin'
           THEN coalesce('security_invoker=true'=ANY(o.reloptions),false)
         WHEN o.relname IN ('team_documents','document_requirements')
           THEN o.relrowsecurity AND o.auth_select AND coalesce(p.policy_count,0)>0
         ELSE null
       END AS contract_ready
FROM objects o
LEFT JOIN policy_counts p ON p.tablename=o.relname
ORDER BY o.relname;

-- Seguridad de la función usada por la vista. Una función SECURITY DEFINER
-- requiere auditoría por cuerpo y pruebas negativas, NO basta con este catálogo.
SELECT p.proname,p.prosecdef,p.proconfig,
       has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('apdb_document_access_allowed','apdb_storage_team_path_allowed')
ORDER BY p.proname;

-- Consulta de políticas Storage sin acceder a rutas ni contenido de documentos.
SELECT policyname,cmd,roles,qual,with_check
FROM pg_policies
WHERE schemaname='storage' AND tablename='objects'
  AND policyname LIKE 'apdb_documents_%'
ORDER BY policyname;
