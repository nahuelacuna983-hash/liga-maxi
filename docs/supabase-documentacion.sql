-- APdB Liga Maxi - Modulo Documentacion
-- Borrador para revisar antes de ejecutar en Supabase.
-- No ejecutar en produccion sin backup y prueba previa.

create table if not exists public.document_requirements (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid references public.organizaciones(id),
  torneo_id uuid references public.torneos(id),
  nombre text not null,
  descripcion text,
  categoria_id uuid references public.categorias(id),
  obligatorio boolean not null default true,
  requiere_vencimiento boolean not null default false,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.team_documents (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.document_requirements(id),
  organizacion_id uuid references public.organizaciones(id),
  torneo_id uuid references public.torneos(id),
  categoria_id uuid references public.categorias(id),
  equipo_id uuid references public.equipos(id),
  equipo_nombre text not null,
  uploaded_by text,
  storage_path text,
  file_name text,
  file_type text,
  file_size bigint,
  status text not null default 'pendiente',
  vencimiento date,
  observacion text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_documents_status_check
    check (status in ('pendiente', 'cargado', 'observado', 'aprobado', 'rechazado', 'vencido'))
);

create table if not exists public.document_events (
  id uuid primary key default gen_random_uuid(),
  team_document_id uuid references public.team_documents(id),
  event_type text not null,
  actor text,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists idx_document_requirements_categoria
  on public.document_requirements(categoria_id);

create index if not exists idx_document_requirements_torneo
  on public.document_requirements(torneo_id);

create index if not exists idx_team_documents_categoria_equipo
  on public.team_documents(categoria_id, equipo_id);

create index if not exists idx_team_documents_torneo
  on public.team_documents(torneo_id);

create index if not exists idx_team_documents_status
  on public.team_documents(status);

create index if not exists idx_document_events_document
  on public.document_events(team_document_id);

create or replace view public.v_team_documents_admin as
select
  td.id,
  td.requirement_id,
  dr.nombre as requirement_nombre,
  td.organizacion_id,
  o.nombre as organizacion_nombre,
  td.torneo_id,
  t.nombre as torneo_nombre,
  td.categoria_id,
  c.nombre as categoria_nombre,
  td.equipo_id,
  td.equipo_nombre,
  td.uploaded_by,
  td.storage_path,
  td.file_name,
  td.file_type,
  td.file_size,
  td.status,
  td.vencimiento,
  td.observacion,
  td.reviewed_by,
  td.reviewed_at,
  td.created_at,
  td.updated_at
from public.team_documents td
left join public.document_requirements dr on dr.id = td.requirement_id
left join public.organizaciones o on o.id = td.organizacion_id
left join public.torneos t on t.id = td.torneo_id
left join public.categorias c on c.id = td.categoria_id;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_team_documents_updated_at on public.team_documents;

create trigger trg_team_documents_updated_at
before update on public.team_documents
for each row
execute function public.set_updated_at();

insert into public.document_requirements (nombre, descripcion, obligatorio, requiere_vencimiento)
values
  ('Lista de buena fe', 'Nomina oficial del equipo.', true, false),
  ('Certificado medico', 'Apto medico de jugadores.', true, true),
  ('Seguro', 'Cobertura vigente del equipo o jugadores.', true, true),
  ('Declaracion jurada', 'Declaracion requerida por la Asociacion.', true, false)
on conflict do nothing;

-- Seguridad futura
-- Revisar antes de ejecutar. Estas politicas dependen de como se migren delegados/auth.
--
-- alter table public.document_requirements enable row level security;
-- alter table public.team_documents enable row level security;
-- alter table public.document_events enable row level security;
--
-- Politica inicial posible:
-- - lectura publica solo de requirements activos;
-- - delegados ven documentos de sus equipos;
-- - asociacion ve todo;
-- - escrituras mediante RPC validada.
--
-- No habilitar RLS sin probar primero porque podria bloquear la app actual.
