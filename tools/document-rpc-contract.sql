-- Contrato e inspección de las ocho RPC documentales históricas.
-- Solo lectura sobre catálogos; CREATE TEMP no modifica datos persistentes.
-- Ejecutar en una base aislada o con una conexión expresamente autorizada.

\set ON_ERROR_STOP on

drop table if exists tmp_document_rpc_expected;
create temporary table tmp_document_rpc_expected (
  routine_name text primary key,
  anonymous_allowed boolean not null,
  delegate_scope text not null,
  association_scope text not null,
  actor_must_derive_from_session boolean not null
);

insert into tmp_document_rpc_expected values
 ('add_team_player', false, 'own team and category', 'authorized tournament', true),
 ('mark_player_document_uploaded', false, 'own team player', 'authorized tournament', true),
 ('review_player_document', false, 'none by default', 'authorized tournament/category', true),
 ('review_team_document', false, 'none', 'authorized team/category', true),
 ('review_drive_player_document', false, 'none', 'authorized tournament/category', true),
 ('create_player_from_drive_review', false, 'none', 'authorized tournament/category', true),
 ('request_team_player_deactivation', false, 'own team request only', 'authorized tournament', true),
 ('deactivate_team_player', false, 'none', 'authorized administrative scope', true);

-- Función, owner, SECURITY DEFINER y configuración efectiva.
select n.nspname as schema_name,
       p.proname as routine_name,
       p.oid::regprocedure as signature,
       r.rolname as owner,
       p.prosecdef as security_definer,
       p.proconfig as configuration,
       pg_get_function_identity_arguments(p.oid) as identity_arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_roles r on r.oid = p.proowner
where n.nspname = 'public'
  and p.proname in (select routine_name from tmp_document_rpc_expected)
order by p.proname, p.oid::regprocedure::text;

-- EXECUTE ACL por rutina, sin exponer valores de aplicación.
select p.oid::regprocedure as signature,
       coalesce(grantee.rolname, 'PUBLIC') as grantee,
       privilege_type,
       is_grantable
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
left join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a on true
left join pg_roles grantee on grantee.oid = a.grantee
where n.nspname = 'public'
  and p.proname in (select routine_name from tmp_document_rpc_expected)
  and a.privilege_type = 'EXECUTE'
order by p.proname, p.oid::regprocedure::text, grantee;

-- Resultado de contrato esperado: no es una escritura ni una prueba de autorización.
select * from tmp_document_rpc_expected order by routine_name;

-- Hallazgos estáticos de grants peligrosos en la instalación inspeccionada.
select p.oid::regprocedure as signature,
       p.proname,
       bool_or(coalesce(grantee.rolname, 'PUBLIC') = 'anon') as grants_anon,
       bool_or(coalesce(grantee.rolname, 'PUBLIC') = 'authenticated') as grants_authenticated
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
left join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a on true
left join pg_roles grantee on grantee.oid = a.grantee
where n.nspname = 'public'
  and p.proname in (select routine_name from tmp_document_rpc_expected)
  and a.privilege_type = 'EXECUTE'
group by p.oid, p.proname
order by p.proname, p.oid::regprocedure::text;
