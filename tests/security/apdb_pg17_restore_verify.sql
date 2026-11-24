\set ON_ERROR_STOP on
DO $$
BEGIN
  IF current_setting('server_version_num')::integer < 170000 THEN RAISE EXCEPTION 'PG17_REQUIRED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname='supabase_vault') THEN RAISE EXCEPTION 'VAULT_MISSING'; END IF;
  IF to_regnamespace('auth') IS NULL OR to_regnamespace('storage') IS NULL THEN RAISE EXCEPTION 'MANAGED_SCHEMA_MISSING'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.apdb_restore_probe WHERE id=1 AND value='synthetic-only') THEN RAISE EXCEPTION 'DATA_MISSING'; END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.apdb_restore_probe'::regclass) THEN RAISE EXCEPTION 'RLS_MISSING'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='apdb_restore_probe') THEN RAISE EXCEPTION 'POLICY_MISSING'; END IF;
  IF to_regprocedure('public.apdb_restore_probe_function()') IS NULL THEN RAISE EXCEPTION 'FUNCTION_MISSING'; END IF;
END $$;
SELECT 'APDB_SUPABASE_PG17_RESTORE_OK' AS result;
