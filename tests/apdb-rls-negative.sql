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

set role authenticated;
do $$
begin
  begin
    insert into public.partidos(id) values ('00000000-0000-0000-0000-000000000902');
    raise exception 'ASSERTION_FAILED: authenticated insert partidos succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    perform id from public.team_documents;
    raise exception 'ASSERTION_FAILED: authenticated read team_documents succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Sonda positiva controlada: demuestra que una política permisiva con grant
-- sí permitiría escribir. Todo se revierte al finalizar esta transacción; no
-- forma parte de la fixture aprobada.
begin;
create temporary table rls_insecure_probe (id integer primary key);
alter table rls_insecure_probe enable row level security;
grant insert on rls_insecure_probe to anon;
create policy rls_insecure_probe_write on rls_insecure_probe for insert to anon with check (true);
set role anon;
insert into rls_insecure_probe values (1);
do $$
begin
  if (select count(*) from rls_insecure_probe) <> 1 then
    raise exception 'ASSERTION_FAILED: permissive probe did not persist the expected row';
  end if;
end $$;
reset role;
rollback;

select 'APDB_RLS_NEGATIVE_BEHAVIOR_OK' as result;
