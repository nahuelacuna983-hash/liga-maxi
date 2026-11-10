-- Pruebas de comportamiento contra docs/apdb-2027-rls-fixture.sql.
-- Ejecutar como superusuario del servicio descartable, sólo en liga_maxi_gate.
\set ON_ERROR_STOP on

select case when not has_table_privilege('anon', 'partidos', 'INSERT')
  then 'ANON_WRITE_DENIED' else '' end as write_grant_check;
select case when not has_table_privilege('anon', 'team_documents', 'SELECT')
  then 'ANON_PRIVATE_READ_DENIED' else '' end as private_read_grant_check;

set role anon;
do $$
begin
  begin
    insert into public.partidos(id) values ('00000000-0000-0000-0000-000000000901');
    raise exception 'ASSERTION_FAILED: anon insert partidos succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    perform id from public.team_documents;
    raise exception 'ASSERTION_FAILED: anon read team_documents succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select 'APDB_RLS_NEGATIVE_BEHAVIOR_OK' as result;
