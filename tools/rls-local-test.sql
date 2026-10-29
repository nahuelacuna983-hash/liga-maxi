\set ON_ERROR_STOP on

create extension if not exists pgcrypto;

-- Synthetic Supabase-compatible surface. Nothing here connects to production.
create role anon nologin;
create role authenticated nologin;
create schema auth;

create function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create function auth.jwt() returns jsonb
language sql stable
as $$ select jsonb_build_object('email', current_setting('request.jwt.claim.email', true)) $$;

create table public.torneos (
  id uuid primary key,
  estado text not null
);
create table public.categorias (
  id uuid primary key,
  torneo_id uuid not null references public.torneos(id),
  nombre text not null,
  estado text not null,
  formato text,
  playoffs boolean,
  clasificados integer,
  dia_juego integer,
  fecha_inicio date,
  fecha_fin date,
  frecuencia integer,
  fechas_bloqueadas jsonb default '[]'::jsonb,
  series_playoff jsonb
);
create table public.equipos (
  id uuid primary key,
  categoria_id uuid not null references public.categorias(id),
  nombre text not null,
  activo boolean default true
);
create table public.partidos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.categorias(id),
  local text not null,
  visitante text not null,
  jornada integer,
  fecha date,
  libre text,
  puntos_local integer,
  puntos_visitante integer,
  estado_resultado text,
  cargado_por text,
  cargado_en timestamptz
);
create table public.app_user_permissions (
  user_id uuid not null,
  torneo_id uuid not null,
  categoria_id uuid,
  equipo_id uuid,
  equipo_nombre text,
  can_load_results boolean default false,
  can_correct_results boolean default false,
  can_manage_tournaments boolean default false
);
alter table public.app_user_permissions enable row level security;
create table public.delegados (id uuid primary key, auth_user_id uuid, activo boolean);
create table public.delegado_categorias (delegado_id uuid, categoria_id uuid);

grant usage on schema public, auth to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;

insert into public.torneos values ('00000000-0000-0000-0000-000000000001', 'activo');
insert into public.categorias (id, torneo_id, nombre, estado, fechas_bloqueadas)
values ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Prueba', 'publicada', '[]');
insert into public.equipos values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000010', 'A', true),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000010', 'B', true),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000010', 'C', true);

-- Apply the exact proposal under test.
\i supabase/migrations/20261029_restrict_partidos_write_by_permission.sql

-- The obsolete overload must not remain callable.
do $$ begin
  if to_regprocedure('public.cargar_resultado_partido(uuid,integer,integer,text)') is not null then
    raise exception 'legacy result RPC overload still exists';
  end if;
end $$;

-- Fixture publication: only global Association permission may pass.
insert into public.app_user_permissions values
  ('00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-000000000001', null, null, null, false, false, true);

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000aa', false);
select set_config('request.jwt.claim.email', 'asociacion@test.invalid', false);
select public.publicar_fixture_categoria(
  '00000000-0000-0000-0000-000000000010',
  '[{"local":"A","visitante":"B","jornada":1,"fecha":"2027-01-01","libre":"C"}]'::jsonb,
  '{"estado":"publicada","fechas_bloqueadas":[]}'::jsonb
);
reset role;

do $$ begin
  if (select count(*) from public.partidos) <> 1 then raise exception 'fixture was not persisted'; end if;
end $$;

-- Reset the synthetic fixture and test blocked date supplied by the same request.
delete from public.partidos;
update public.categorias set fechas_bloqueadas = '[]'::jsonb;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000aa', false);
do $$ begin
  begin
    perform public.publicar_fixture_categoria(
      '00000000-0000-0000-0000-000000000010',
      '[{"local":"A","visitante":"B","jornada":1,"fecha":"2027-01-02","libre":"C"}]'::jsonb,
      '{"estado":"publicada","fechas_bloqueadas":["2027-01-02"]}'::jsonb
    );
    raise exception 'blocked request was accepted';
  exception when others then
    if position('fecha bloqueada' in lower(sqlerrm)) = 0 then raise; end if;
  end;
end $$;
reset role;

-- Load and correction matrix. Delegates are team-scoped; Association is global.
insert into public.partidos (categoria_id, local, visitante, jornada, fecha, estado_resultado)
values ('00000000-0000-0000-0000-000000000010', 'A', 'B', 1, '2027-02-01', 'pendiente'),
       ('00000000-0000-0000-0000-000000000010', 'B', 'C', 1, '2027-02-01', 'pendiente');
insert into public.app_user_permissions values
  ('00000000-0000-0000-0000-0000000000a0', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-0000000000a1', 'A', true, false, false),
  ('00000000-0000-0000-0000-0000000000b0', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-0000000000b1', 'B', true, false, false),
  ('00000000-0000-0000-0000-0000000000ac', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', null, null, false, true, true);

-- Anonymous cannot execute the RPC or write directly.
set role anon;
do $$ begin
  begin perform public.cargar_resultado_partido('00000000-0000-0000-0000-000000000000', 80, 70); raise exception 'anon RPC accepted';
  exception when insufficient_privilege then null; end;
  begin insert into public.partidos(categoria_id, local, visitante) values ('00000000-0000-0000-0000-000000000010','X','Y'); raise exception 'anon insert accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Delegate A can load A-B but cannot load/correct B-C.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a0', false);
select public.cargar_resultado_partido((select id from public.partidos where local='A' and visitante='B'), 80, 70);
do $$ begin
  begin perform public.cargar_resultado_partido((select id from public.partidos where local='B' and visitante='C'), 80, 70); raise exception 'delegate A touched B-C';
  exception when others then if position('permiso' in lower(sqlerrm)) = 0 then raise; end if; end;
end $$;
reset role;

-- Delegate B can load B-C, but cannot correct it after being granted no correction capability.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b0', false);
select public.cargar_resultado_partido((select id from public.partidos where local='B' and visitante='C'), 75, 70);
do $$ begin
  begin perform public.cargar_resultado_partido((select id from public.partidos where local='B' and visitante='C'), 76, 70); raise exception 'delegate B corrected without permission';
  exception when others then if position('correccion' in lower(sqlerrm)) = 0 then raise; end if; end;
end $$;
reset role;

-- Direct UPDATE/INSERT/DELETE remain denied even for authenticated clients.
set role authenticated;
do $$ begin
  begin update public.partidos set puntos_local=99; raise exception 'direct update accepted'; exception when insufficient_privilege then null; end;
  begin delete from public.partidos; raise exception 'direct delete accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;

select 'RLS_LOCAL_TEST_OK' as result;
