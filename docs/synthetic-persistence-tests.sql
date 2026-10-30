-- Ejecutar sólo en una base PostgreSQL descartable, con ON_ERROR_STOP activo.
\set ON_ERROR_STOP on
begin;
create or replace function lm_test_assert(condition boolean, label text) returns void language plpgsql as $$
begin if not condition then raise exception 'ASSERTION_FAILED: %', label; end if; end $$;

insert into lm_organizations values ('00000000-0000-0000-0000-000000000001','Org A'), ('00000000-0000-0000-0000-000000000002','Org B');
insert into lm_users values ('00000000-0000-0000-0000-000000000011','Asociacion A'), ('00000000-0000-0000-0000-000000000012','Asociacion B'), ('00000000-0000-0000-0000-000000000013','Delegado A');
insert into lm_memberships values ('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','association'), ('00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000002','association'), ('00000000-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000001','delegate');
insert into lm_tournaments values ('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000001','Torneo A',2027,'active'), ('00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000002','Torneo B',2027,'active');
insert into lm_categories values ('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000101','Maxi A'), ('00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000102','Maxi B');
insert into lm_teams values ('00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000001','Equipo A'), ('00000000-0000-0000-0000-000000000302','00000000-0000-0000-0000-000000000002','Equipo B');
insert into lm_category_teams values ('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000301'), ('00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000302');
insert into lm_players values ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000001','Jugador A',null);
insert into lm_registrations (id,player_id,tournament_id,category_id,team_id) values ('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000301');

set role lm_app;
set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000011';
select lm_test_assert((select count(*) from lm_tournaments) = 1, 'organization A sees one tournament');
select lm_test_assert((select count(*) from lm_categories) = 1, 'organization A sees one category');

-- La FK compuesta debe impedir cruzar equipo de Org B con categoría de Org A.
do $$ begin
  begin
    insert into lm_category_teams values ('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000302');
    raise exception 'ASSERTION_FAILED: cross organization team insert succeeded';
  exception when foreign_key_violation then null;
  end;
end $$;

insert into lm_document_events (registration_id, requirement, status, evidence_ref, actor_id) values ('00000000-0000-0000-0000-000000000501','seguro','observed','synthetic://evidence/1','00000000-0000-0000-0000-000000000011');
select lm_test_assert((select count(*) from lm_document_events) = 1, 'document event inserted');
do $$ begin
  begin
    update lm_document_events set status = 'approved';
    raise exception 'ASSERTION_FAILED: history update succeeded';
  exception when sqlstate '55000' then null;
  end;
end $$;
do $$ begin
  begin
    delete from lm_document_events;
    raise exception 'ASSERTION_FAILED: history delete succeeded';
  exception when sqlstate '55000' then null;
  end;
end $$;
select lm_test_assert((select count(*) from lm_document_events) = 1, 'history preserved after rejected mutations');
rollback;
select 'POSTGRES_SYNTHETIC_TESTS_READY' as result;
