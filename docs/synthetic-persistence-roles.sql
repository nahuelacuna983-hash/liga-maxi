-- Preparación de roles únicamente para una base descartable. Ejecutar como superusuario local.
-- No ejecutar contra servicios existentes.
create role lm_owner noinherit;
create role lm_app noinherit;
create role lm_public noinherit;
grant usage on schema public to lm_app, lm_public;
grant select on lm_organizations, lm_memberships, lm_tournaments, lm_categories,
  lm_teams, lm_category_teams, lm_delegate_assignments, lm_players,
  lm_registrations, lm_document_events to lm_app, lm_public;
grant insert on lm_document_events to lm_app;
grant insert on lm_category_teams to lm_app;
grant update, delete on lm_document_events to lm_app;
grant usage, select on sequence lm_document_events_id_seq to lm_app;
-- El harness debe aplicar SET ROLE lm_app después de cargar datos con lm_owner.
-- lm_owner no se usa para afirmar RLS: las pruebas de autorización deben correr como lm_app.
