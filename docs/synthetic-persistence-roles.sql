-- Preparación de roles únicamente para una base descartable. Ejecutar como superusuario local.
-- No ejecutar contra servicios existentes.
create role lm_owner noinherit;
create role lm_app noinherit;
create role lm_public noinherit;
grant usage on schema public to lm_app, lm_public;
-- El harness debe aplicar SET ROLE lm_app después de cargar datos con lm_owner.
-- lm_owner no se usa para afirmar RLS: las pruebas de autorización deben correr como lm_app.
