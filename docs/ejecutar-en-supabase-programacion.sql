-- APdB Liga Maxi - Programacion de partidos y comunicacion arbitral
-- Ejecutar completo en Supabase SQL Editor, en una consulta nueva.
--
-- Guarda cancha, dia, hora y estado de comunicacion sin tocar resultados ni fixture.

create table if not exists public.match_schedules (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.partidos(id) on delete cascade,
  categoria_id uuid not null references public.categorias(id) on delete cascade,
  categoria_nombre text,
  jornada integer,
  local text not null,
  visitante text not null,
  fecha_partido date,
  hora time,
  cancha text,
  estado text not null default 'pendiente',
  observacion text,
  informado_por text,
  informado_en timestamptz,
  confirmado_por text,
  confirmado_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_schedules_partido_unique unique (partido_id),
  constraint match_schedules_estado_valid check (estado in ('pendiente', 'listo', 'enviado', 'confirmado'))
);

create index if not exists match_schedules_categoria_idx
  on public.match_schedules (categoria_id, fecha_partido, hora);

alter table public.match_schedules enable row level security;

drop policy if exists "match_schedules_select" on public.match_schedules;
create policy "match_schedules_select"
  on public.match_schedules
  for select
  to anon, authenticated
  using (true);

drop policy if exists "match_schedules_insert" on public.match_schedules;
create policy "match_schedules_insert"
  on public.match_schedules
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "match_schedules_update" on public.match_schedules;
create policy "match_schedules_update"
  on public.match_schedules
  for update
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update on public.match_schedules to anon, authenticated;
