-- Matriz aislada de autorización para las ocho RPC documentales históricas.
-- PostgreSQL 16. No importa migraciones ni se conecta a Supabase.
-- Las funciones son un arnés sintético: conservan firmas/efectos mínimos,
-- pero agregan auth.uid() y alcance para probar el contrato propuesto.
\set ON_ERROR_STOP on

create extension if not exists pgcrypto;
do $$ begin
  create role anon nologin;
exception when duplicate_object then null; end $$;
do $$ begin
  create role authenticated nologin;
exception when duplicate_object then null; end $$;

create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('app.auth_uid', true), '')::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('app.auth_role', true), ''), 'anon')
$$;

create table if not exists app_users(id uuid primary key, role_name text not null);
create table if not exists app_user_permissions(
  user_id uuid, torneo_id uuid, categoria_id uuid, equipo_id uuid,
  can_load_documents boolean default false, can_review_documents boolean default false,
  can_manage_users boolean default false, can_request_deactivation boolean default false,
  can_manage_tournaments boolean default false
);
create table if not exists teams(id uuid primary key, torneo_id uuid, categoria_id uuid);
create table if not exists team_players(
  id uuid primary key, torneo_id uuid, categoria_id uuid, equipo_id uuid,
  nombre text, activo boolean not null default true, baja_solicitada boolean not null default false,
  baja_motivo text
);
create table if not exists player_documents(
  id uuid primary key, player_id uuid, equipo_id uuid, status text not null default 'pendiente',
  storage_path text, uploaded_by uuid, reviewed_by uuid, observacion text
);
create table if not exists team_documents(
  id uuid primary key, equipo_id uuid, status text not null default 'pendiente',
  storage_path text, reviewed_by uuid, observacion text
);
create table if not exists player_document_events(
  id bigserial, document_id uuid, actor uuid, event_type text
);

create or replace function public._doc_can(p_cap text, p_torneo uuid, p_categoria uuid, p_equipo uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select auth.uid() is not null and exists (
    select 1 from app_user_permissions p
    where p.user_id = auth.uid()
      and (p.torneo_id is null or p.torneo_id = p_torneo)
      and (p.categoria_id is null or p.categoria_id = p_categoria)
      and (p.equipo_id is null or p.equipo_id = p_equipo)
      and case p_cap
        when 'load' then p.can_load_documents
        when 'review' then p.can_review_documents
        when 'users' then p.can_manage_users
        when 'deactivate' then p.can_request_deactivation
        else false end
  )
$$;

create or replace function public.add_team_player(uuid, uuid, uuid, uuid, text, text, text, text, text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid := gen_random_uuid(); begin
  if not public._doc_can('users', $2, $3, $4) then raise exception 'not authorized'; end if;
  insert into team_players values (v_id,$2,$3,$4,$6,true,false,null); return v_id;
end $$;
create or replace function public.mark_player_document_uploaded(uuid, text, text, text, text, bigint, date)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_team uuid; v_torneo uuid; v_cat uuid; begin
  select tp.equipo_id,tp.torneo_id,tp.categoria_id into v_team,v_torneo,v_cat
  from player_documents d join team_players tp on tp.id=d.player_id where d.id=$1;
  if not public._doc_can('load',v_torneo,v_cat,v_team) then raise exception 'not authorized'; end if;
  update player_documents set storage_path=$3, uploaded_by=auth.uid(), status='cargado' where id=$1;
  insert into player_document_events(document_id,actor,event_type) values($1,auth.uid(),'uploaded'); return true;
end $$;
create or replace function public.review_player_document(uuid, text, text, text default null)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_team uuid; v_torneo uuid; v_cat uuid; begin
  select tp.equipo_id,tp.torneo_id,tp.categoria_id into v_team,v_torneo,v_cat from player_documents d join team_players tp on tp.id=d.player_id where d.id=$1;
  if not public._doc_can('review',v_torneo,v_cat,v_team) then raise exception 'not authorized'; end if;
  update player_documents set status=$2, reviewed_by=auth.uid(), observacion=$4 where id=$1; return true;
end $$;
create or replace function public.review_team_document(uuid, text, text, text default null)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_team uuid; v_torneo uuid; v_cat uuid; begin
  select t.id,t.torneo_id,t.categoria_id into v_team,v_torneo,v_cat from team_documents d join teams t on t.id=d.equipo_id where d.id=$1;
  if not public._doc_can('review',v_torneo,v_cat,v_team) then raise exception 'not authorized'; end if;
  update team_documents set status=$2, reviewed_by=auth.uid(), observacion=$4 where id=$1; return true;
end $$;
create or replace function public.review_drive_player_document(uuid, text, text, uuid, text, text, text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_team uuid; v_torneo uuid; v_cat uuid; begin
  select tp.equipo_id,tp.torneo_id,tp.categoria_id into v_team,v_torneo,v_cat from player_documents d join team_players tp on tp.id=d.player_id where d.id=$1;
  if not public._doc_can('review',v_torneo,v_cat,v_team) then raise exception 'not authorized'; end if;
  update player_documents set status=$2, reviewed_by=auth.uid(), observacion=$3 where id=$1; return true;
end $$;
create or replace function public.create_player_from_drive_review(uuid,uuid,uuid,uuid,uuid,text,text,text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid := gen_random_uuid(); begin
  if not public._doc_can('users',$2,$3,$4) then raise exception 'not authorized'; end if;
  insert into team_players values(v_id,$2,$3,$4,$6,true,false,null); return v_id;
end $$;
create or replace function public.request_team_player_deactivation(uuid,text,text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_team uuid; v_torneo uuid; v_cat uuid; begin
  select equipo_id,torneo_id,categoria_id into v_team,v_torneo,v_cat from team_players where id=$1;
  if not public._doc_can('deactivate',v_torneo,v_cat,v_team) then raise exception 'not authorized'; end if;
  update team_players set baja_solicitada=true,baja_motivo=$3 where id=$1;
end $$;
create or replace function public.deactivate_team_player(uuid,text,text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_team uuid; v_torneo uuid; v_cat uuid; begin
  select equipo_id,torneo_id,categoria_id into v_team,v_torneo,v_cat from team_players where id=$1;
  if not public._doc_can('users',v_torneo,v_cat,v_team) then raise exception 'not authorized'; end if;
  update team_players set activo=false,baja_solicitada=false,baja_motivo=$3 where id=$1;
end $$;

-- Fixture data: Association global, delegates A/B scoped, anonymous context.
\set torneo 00000000-0000-0000-0000-000000000001
\set categoria 00000000-0000-0000-0000-000000000011
\set equipo_a 00000000-0000-0000-0000-0000000000a1
\set equipo_b 00000000-0000-0000-0000-0000000000b1
\set assoc 00000000-0000-0000-0000-0000000000aa
\set del_a 00000000-0000-0000-0000-0000000000da
\set del_b 00000000-0000-0000-0000-0000000000db
insert into teams values(:'equipo_a'::uuid,:'torneo'::uuid,:'categoria'::uuid),(:'equipo_b'::uuid,:'torneo'::uuid,:'categoria'::uuid) on conflict do nothing;
insert into app_users values(:'assoc'::uuid,'asociacion'),(:'del_a'::uuid,'delegado'),(:'del_b'::uuid,'delegado') on conflict do nothing;
insert into app_user_permissions values
 (:'assoc'::uuid,:'torneo'::uuid,null,null,true,true,true,true,true),
 (:'del_a'::uuid,:'torneo'::uuid,:'categoria'::uuid,:'equipo_a'::uuid,true,false,false,true,false),
 (:'del_b'::uuid,:'torneo'::uuid,:'categoria'::uuid,:'equipo_b'::uuid,true,false,false,true,false);
insert into team_players values('00000000-0000-0000-0000-0000000000a1',:'torneo'::uuid,:'categoria'::uuid,:'equipo_a'::uuid,'Jugador A',true,false,null),('00000000-0000-0000-0000-0000000000b1',:'torneo'::uuid,:'categoria'::uuid,:'equipo_b'::uuid,'Jugador B',true,false,null) on conflict do nothing;
insert into player_documents values('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000a1',:'equipo_a'::uuid,'pendiente',null,null,null,null),('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-0000000000b1',:'equipo_b'::uuid,'pendiente',null,null,null,null) on conflict do nothing;
insert into team_documents values('00000000-0000-0000-0000-0000000000cd',:'equipo_a'::uuid,'pendiente',null,null,null) on conflict do nothing;

-- Helper de aserción y ejecución esperada/rechazada.
create or replace function public._expect_reject(p_sql text) returns void language plpgsql as $$ begin execute p_sql; raise exception 'expected rejection'; exception when others then if sqlerrm='expected rejection' then raise; end if; end $$;
set role authenticated;
set app.auth_uid = :'del_a'; set app.auth_role='authenticated';
select public.mark_player_document_uploaded('00000000-0000-0000-0000-0000000000d1','spoof','a.pdf','a.pdf','application/pdf',1,current_date);
select public.request_team_player_deactivation('00000000-0000-0000-0000-0000000000a1','spoof','request');
do $$ begin
  perform public.review_player_document('00000000-0000-0000-0000-0000000000d2','aprobado','spoof','cross-team');
  raise exception 'delegate cross-team should reject';
exception when others then
  if sqlerrm = 'delegate cross-team should reject' then raise; end if;
  if sqlerrm <> 'not authorized' then raise exception 'unexpected delegate failure: %', sqlerrm; end if;
end $$;
set app.auth_uid = :'assoc';
select public.review_player_document('00000000-0000-0000-0000-0000000000d2','aprobado','spoof','association review');
reset role;
reset app.auth_uid;
reset app.auth_role;
do $$ begin
  if not exists (select 1 from player_documents where id='00000000-0000-0000-0000-0000000000d2' and reviewed_by = '00000000-0000-0000-0000-0000000000aa'::uuid and status = 'aprobado') then
    raise exception 'association audit assertion failed';
  end if;
end $$;
set role anon; set app.auth_uid = ''; set app.auth_role = 'anon';
do $$ begin
  perform public.review_player_document('00000000-0000-0000-0000-0000000000d1','aprobado','spoof','anon');
  raise exception 'anon should reject';
exception when others then
  if sqlerrm = 'anon should reject' then raise; end if;
  if sqlerrm <> 'not authorized' then raise exception 'unexpected anonymous failure: %', sqlerrm; end if;
end $$;
reset role;
do $$ begin
  if (select count(*) from team_players) <> 2 then raise exception 'partial player mutation detected'; end if;
  if (select status from player_documents where id='00000000-0000-0000-0000-0000000000d1') <> 'cargado' then raise exception 'anonymous attempt changed document'; end if;
  if (select status from player_documents where id='00000000-0000-0000-0000-0000000000d2') <> 'aprobado' then raise exception 'association result not persisted'; end if;
end $$;

-- Catálogo de seguridad del arnés: todas SECURITY DEFINER, search_path fijo, EXECUTE público revocado.
select p.proname, p.prosecdef, p.proconfig, r.rolname as owner
from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles r on r.oid=p.proowner
where n.nspname='public' and p.proname in ('add_team_player','mark_player_document_uploaded','review_player_document','review_team_document','review_drive_player_document','create_player_from_drive_review','request_team_player_deactivation','deactivate_team_player')
order by p.proname;
select 'DOCUMENT_RPC_LOCAL_TEST_OK' as result;
