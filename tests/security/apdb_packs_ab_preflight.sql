-- APdB 2027 Packs A/B: read-only differential preflight.
-- Run against a disposable clone, never against production or persistent staging.
-- The query intentionally fails closed when a candidate object is already present
-- with an unexpected owner, privilege, RLS state, or function signature.

\set ON_ERROR_STOP on

create temporary table apdb_pack_preflight_checks(name text primary key, passed boolean not null, detail text not null);

insert into apdb_pack_preflight_checks
select 'candidate_tables_absent',
  not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='apdb_player_eligibility_events'),
  'Eligibility event table must be absent before the differential is planned.';

insert into apdb_pack_preflight_checks
select 'document_tables_present',
  (select count(*) from information_schema.tables where table_schema='public' and table_name in ('team_documents','player_documents','document_requirements','document_files')) = 4,
  'Existing document tables are required; the differential must not recreate them.';

insert into apdb_pack_preflight_checks
select 'storage_scope_present',
  exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='apdb_storage_team_path_allowed')
  and exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='apdb_documents_select'),
  'Existing organization/team Storage scope must remain the authority.';

insert into apdb_pack_preflight_checks
select 'legacy_document_views_not_public',
  not exists (select 1 from information_schema.role_table_grants where table_schema='public' and table_name in ('v_team_documents_admin','v_player_documents_admin') and grantee in ('anon','authenticated') and privilege_type='SELECT'),
  'Legacy document views must not be directly readable by API roles.';

do $$
declare failed text;
begin
  select string_agg(name || ': ' || detail, E'\n') into failed
  from apdb_pack_preflight_checks where not passed;
  if failed is not null then raise exception using message = 'APDB_PACKS_AB_PREFLIGHT_FAILED', detail = failed; end if;
end $$;

select 'APDB_PACKS_AB_PREFLIGHT_OK' as marker, name, detail
from apdb_pack_preflight_checks order by name;
