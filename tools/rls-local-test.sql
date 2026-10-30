-- Punto de entrada compatible con .github/workflows/rls-local.yml.
-- El workflow ejecuta este archivo como postgres en una base descartable.
-- No usar contra Supabase ni otra base persistente.
\set ON_ERROR_STOP on

-- \ir resuelve estas rutas relativas al directorio de este archivo.
\ir ../docs/synthetic-persistence-schema.sql
\ir ../docs/synthetic-persistence-roles.sql
\ir ../docs/synthetic-persistence-tests.sql

select 'RLS_2027_ENTRYPOINT_OK' as result;
