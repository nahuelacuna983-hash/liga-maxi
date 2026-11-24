-- Run ONLY as a read-only inspection on hosted staging.
-- Mirrors the fail-closed baseline checks inside staging-candidate SQL.
WITH checks AS (
 SELECT 'migration_ledger' AS gate,
   (SELECT max(version)='20261123163609' FROM supabase_migrations.schema_migrations) AS ok
 UNION ALL SELECT 'eligibility_absent',to_regclass('public.apdb_player_eligibility_events') IS NULL
 UNION ALL SELECT 'new_document_rpc_absent',
   to_regprocedure('public.apdb_list_team_documents(uuid)') IS NULL
   AND to_regprocedure('public.apdb_list_player_documents(uuid)') IS NULL
 UNION ALL SELECT 'existing_storage_helper',
   to_regprocedure('public.apdb_storage_team_path_allowed(text,text)') IS NOT NULL
 UNION ALL SELECT 'legacy_storage_helper_absent',
   to_regprocedure('public.apdb_storage_path_allowed(text,text)') IS NULL
 UNION ALL SELECT 'four_scoped_storage_policies',
   (SELECT count(*)=4 FROM pg_policies WHERE schemaname='storage'
      AND tablename='objects'
      AND policyname IN ('apdb_documents_select','apdb_documents_insert','apdb_documents_update','apdb_documents_delete')
      AND (coalesce(qual,'')||coalesce(with_check,'')) LIKE '%apdb_storage_team_path_allowed%')
 UNION ALL SELECT 'baseline_document_tables',
   to_regclass('public.document_events') IS NOT NULL
   AND to_regclass('public.document_files') IS NOT NULL
   AND to_regclass('public.team_players') IS NOT NULL
 UNION ALL SELECT 'documents_RLS',
   (SELECT bool_and(relrowsecurity) FROM pg_class
      WHERE oid IN ('public.team_players'::regclass,'public.team_documents'::regclass,
      'public.player_documents'::regclass,'public.document_requirements'::regclass))
 UNION ALL SELECT 'document_views_present',
   to_regclass('public.v_team_documents_admin') IS NOT NULL
   AND to_regclass('public.v_player_documents_admin') IS NOT NULL
 UNION ALL SELECT 'existing_document_helper',
   to_regprocedure('public.apdb_document_access_allowed(uuid,uuid,uuid)') IS NOT NULL
)
SELECT gate, ok, CASE WHEN ok THEN 'PASS' ELSE 'STOP' END AS decision
FROM checks ORDER BY gate;