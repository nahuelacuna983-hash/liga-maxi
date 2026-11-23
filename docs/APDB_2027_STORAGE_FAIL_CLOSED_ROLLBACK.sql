-- APdB 2027 staging ONLY: emergency fail-closed rollback of document access.
-- DO NOT use against Liga Maxi 2026, and DO NOT restore the old
-- organization-only rules: those allowed cross-team paths and expected a UUID
-- where the official application uses an organization slug.
-- Result: ALL normal authenticated users lose Storage document access.
-- Service-role recovery remains possible (service role bypasses RLS).
-- First preserve current metadata, migration/version and review dependencies.
begin;
drop policy if exists apdb_documents_insert on storage.objects;
drop policy if exists apdb_documents_select on storage.objects;
drop policy if exists apdb_documents_update on storage.objects;
drop policy if exists apdb_documents_delete on storage.objects;
revoke execute on function public.apdb_storage_team_path_allowed(text, text)
  from authenticated;
commit;
-- Confirm storage.objects has NO other policy granting access to bucket 'documentos'.
-- Recovery: reapply the audited team-scoped migration after the underlying
-- cause is fixed, with fresh Auth + Storage tests and institutional approval.
