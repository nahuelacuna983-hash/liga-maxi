-- APdB - Liga Maxi
-- Estadísticas privadas de uso de la app.
--
-- Ejecutar una sola vez en Supabase SQL Editor.
-- La app no se rompe si esta tabla todavía no existe: simplemente no registra estadísticas.

create table if not exists public.app_usage_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null,
  area text,
  categoria_nombre text,
  equipo_nombre text,
  user_role text,
  user_label text,
  session_id text,
  device_type text,
  path text,
  user_agent text
);

create index if not exists idx_app_usage_events_created_at
  on public.app_usage_events (created_at desc);

create index if not exists idx_app_usage_events_event_type
  on public.app_usage_events (event_type);

create index if not exists idx_app_usage_events_categoria
  on public.app_usage_events (categoria_nombre);

alter table public.app_usage_events enable row level security;

drop policy if exists "app_usage_events_insert_anon" on public.app_usage_events;
create policy "app_usage_events_insert_anon"
on public.app_usage_events
for insert
to anon
with check (true);

drop policy if exists "app_usage_events_select_anon" on public.app_usage_events;
create policy "app_usage_events_select_anon"
on public.app_usage_events
for select
to anon
using (true);

-- Nota:
-- La visualización queda oculta detrás de la clave de Asociación/Admin en la app.
-- Para privacidad fuerte a nivel base de datos conviene migrar esta parte a Supabase Auth
-- o a una Edge Function con clave privada.
