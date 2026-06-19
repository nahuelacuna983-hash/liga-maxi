-- APdB Liga Maxi - Resultados de playoffs
-- Ejecutar completo en Supabase SQL Editor, en una consulta nueva.
--
-- Esta tabla guarda resultados de llaves/playoffs sin tocar la tabla de fase regular.

create table if not exists public.playoff_matches (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.categorias(id) on delete cascade,
  categoria_nombre text,
  fase text not null,
  llave text not null,
  titulo text,
  orden integer not null default 0,
  partido_numero integer not null default 1,
  fecha date,
  local text not null,
  visitante text not null,
  puntos_local integer,
  puntos_visitante integer,
  estado text not null default 'pendiente',
  observacion text,
  cargado_por text,
  cargado_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint playoff_matches_unique_match unique (categoria_id, fase, llave, partido_numero),
  constraint playoff_matches_scores_valid check (
    (puntos_local is null and puntos_visitante is null)
    or (puntos_local >= 0 and puntos_visitante >= 0)
  )
);

create index if not exists playoff_matches_categoria_idx
  on public.playoff_matches (categoria_id, orden, partido_numero);

alter table public.playoff_matches enable row level security;

drop policy if exists "playoff_matches_select" on public.playoff_matches;
create policy "playoff_matches_select"
  on public.playoff_matches
  for select
  to anon, authenticated
  using (true);

drop policy if exists "playoff_matches_insert" on public.playoff_matches;
create policy "playoff_matches_insert"
  on public.playoff_matches
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "playoff_matches_update" on public.playoff_matches;
create policy "playoff_matches_update"
  on public.playoff_matches
  for update
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update on public.playoff_matches to anon, authenticated;
