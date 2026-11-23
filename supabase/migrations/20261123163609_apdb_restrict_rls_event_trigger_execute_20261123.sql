-- APdB 2027: restrict accidental exposure of the RLS auto-enabling event trigger.
-- Deployed to APdB 2027 Staging as migration 20261123163609 on 2026-11-23.
-- PostgreSQL event trigger remains owned by postgres and enabled.
-- Local disposable projects may not contain this managed function.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable()
      from public, anon, authenticated;
  end if;
end
$$;
