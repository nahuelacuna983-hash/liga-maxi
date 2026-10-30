-- Ejecutar sólo en una base PostgreSQL descartable después de synthetic-persistence-schema.sql.
begin;
insert into lm_organizations values ('00000000-0000-0000-0000-000000000001','Org A'), ('00000000-0000-0000-0000-000000000002','Org B');
insert into lm_users values ('00000000-0000-0000-0000-000000000011','Asociacion A'), ('00000000-0000-0000-0000-000000000012','Asociacion B'), ('00000000-0000-0000-0000-000000000013','Delegado A');
insert into lm_memberships values ('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','association'), ('00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000002','association'), ('00000000-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000001','delegate');
insert into lm_tournaments values ('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000001','Torneo A',2027,'active'), ('00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000002','Torneo B',2027,'active');
insert into lm_categories values ('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000101','Maxi A'), ('00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000102','Maxi B');
insert into lm_teams values ('00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000001','Equipo A'), ('00000000-0000-0000-0000-000000000302','00000000-0000-0000-0000-000000000002','Equipo B');
insert into lm_category_teams values ('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000301'), ('00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000302');
insert into lm_players values ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000001','Jugador A',null);
insert into lm_registrations (id,player_id,tournament_id,category_id,team_id) values ('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000301');

-- Simula identidad de Asociación A. Debe leer sólo Org A.
set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000011';
select count(*) = 1 as org_a_only from lm_tournaments;
select count(*) = 1 as category_a_only from lm_categories;
-- La referencia cruzada debe fallar por la FK category_id/team_id o por el scope de la política.
do $$ begin
  begin
    insert into lm_category_teams values ('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000302');
    raise exception 'cross organization insert unexpectedly succeeded';
  exception when foreign_key_violation or check_violation or insufficient_privilege then null;
  end;
end $$;
-- El historial debe aceptar INSERT propio y rechazar UPDATE/DELETE.
insert into lm_document_events (registration_id, requirement, status, evidence_ref, actor_id) values ('00000000-0000-0000-0000-000000000501','seguro','observed','synthetic://evidence/1','00000000-0000-0000-0000-000000000011');
do $$ begin
  begin update lm_document_events set status = 'approved'; raise exception 'history update unexpectedly succeeded'; exception when others then null; end;
  begin delete from lm_document_events; raise exception 'history delete unexpectedly succeeded'; exception when others then null; end;
end $$;
rollback;
