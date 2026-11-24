-- Disposable Supabase only. No writes or restore.
-- A pass here is NOT a proof that a real Staging dump has been recovered.
WITH checks AS (
  SELECT 'postgres_17_or_newer' AS gate,
    current_setting('server_version_num')::integer >= 170000 AS ok
  UNION ALL SELECT 'supabase_vault_available',
    EXISTS (SELECT 1 FROM pg_available_extensions WHERE name='supabase_vault')
  UNION ALL SELECT 'auth_schema_present',to_regnamespace('auth') IS NOT NULL
  UNION ALL SELECT 'storage_schema_present',to_regnamespace('storage') IS NOT NULL
)
SELECT gate, CASE WHEN ok THEN 'PASS' ELSE 'STOP' END AS decision
FROM checks ORDER BY gate;
