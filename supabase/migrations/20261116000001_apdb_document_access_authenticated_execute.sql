begin;

-- The view invokes this helper while enforcing its own organization/team scope.
-- Keep direct anonymous invocation disabled; authenticated execution is required
-- by PostgREST when evaluating the exposed view.
revoke execute on function public.apdb_document_access_allowed(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.apdb_document_access_allowed(uuid, uuid, uuid)
  to authenticated;

commit;
