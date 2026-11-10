-- APdB 2027 - fixture de catálogo RLS para PostgreSQL 16 descartable.
--
-- Reconstruida únicamente a partir de los nombres de tablas, vistas, roles y
-- hallazgos documentados en APDB_2027_CONTRATO_COMPATIBILIDAD_RLS.md y
-- APDB_2027_HALLAZGOS_SEGURIDAD_REAL.md. No es un dump de Supabase ni afirma
-- reproducir columnas, RPC o Storage productivos.
--
-- Objetivo: permitir que el gate inspeccione RLS, grants y EXECUTE de forma
-- reproducible. Auth y Storage quedan fuera de alcance.
\set ON_ERROR_STOP on

create role anon noinherit;
create role authenticated noinherit;

create table categorias (id uuid primary key);
create table partidos (id uuid primary key);
create table playoff_matches (id uuid primary key);
create table match_schedules (id uuid primary key);
create table player_documents (id uuid primary key);
create table team_documents (id uuid primary key);
create table document_requirements (id uuid primary key);
create table app_users (id uuid primary key);
create table app_user_permissions (id uuid primary key);
create table team_players (id uuid primary key);

-- El acceso deportivo público es sólo lectura. Las tablas sensibles no tienen
-- grants para anon y todas permanecen protegidas por RLS.
grant usage on schema public to anon, authenticated;
grant select on categorias, partidos, playoff_matches, match_schedules to anon, authenticated;
grant select on document_requirements to anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'categorias','partidos','playoff_matches','match_schedules',
    'player_documents','team_documents','document_requirements',
    'app_users','app_user_permissions','team_players'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

-- Políticas mínimas de lectura pública sólo para el catálogo deportivo. No se
-- inventan reglas de organización para documentos: quedan cerrados en la
-- fixture hasta verificar sus expresiones productivas.
create policy categorias_public_read on categorias for select to anon, authenticated using (true);
create policy partidos_public_read on partidos for select to anon, authenticated using (true);
create policy playoff_public_read on playoff_matches for select to anon, authenticated using (true);
create policy schedules_public_read on match_schedules for select to anon, authenticated using (true);
create policy requirements_public_read on document_requirements for select to anon, authenticated using (true);

create view v_team_documents_admin as select id from team_documents;
create view v_player_documents_admin as select id from player_documents;
create view v_drive_player_documents_admin as select id from player_documents where false;
create view v_document_audit_results_admin as select id from player_documents where false;
create view v_app_user_permissions as select id from app_user_permissions where false;

-- El gate debe comprobar que estas vistas administrativas no sean legibles por
-- anon. Se revoca cualquier privilegio heredado explícitamente.
revoke all on v_team_documents_admin, v_player_documents_admin,
  v_drive_player_documents_admin, v_document_audit_results_admin,
  v_app_user_permissions from anon;

create or replace function set_user_permission(uuid, uuid, uuid, uuid, uuid,
  text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  null;
end $$;
revoke all on function set_user_permission(uuid, uuid, uuid, uuid, uuid,
  text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean) from public;
revoke execute on function set_user_permission(uuid, uuid, uuid, uuid, uuid,
  text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean) from anon;
grant execute on function set_user_permission(uuid, uuid, uuid, uuid, uuid,
  text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean) to authenticated;

select 'APDB_RLS_FIXTURE_READY' as result;
