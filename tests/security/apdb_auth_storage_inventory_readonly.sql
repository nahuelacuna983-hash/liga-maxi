-- Read-only inventory queries for an authorized operator session.
-- Export only counts, names, hashes and policy metadata; never tokens or document bytes.
\set ON_ERROR_STOP on
SELECT 'auth_users_count' AS item, count(*)::text AS value FROM auth.users;
SELECT 'auth_roles' AS item, coalesce(string_agg(DISTINCT coalesce(raw_app_meta_data->>'role',''), ','), '') AS value FROM auth.users;
SELECT 'storage_objects_count' AS item, count(*)::text AS value FROM storage.objects;
SELECT 'storage_buckets' AS item, coalesce(string_agg(id, ',' ORDER BY id), '') AS value FROM storage.buckets;
SELECT 'storage_policies' AS item, count(*)::text AS value FROM pg_policies WHERE schemaname='storage';
SELECT 'public_rls_tables' AS item, count(*)::text AS value FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity;
