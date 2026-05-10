-- ============================================================
-- APdB Liga Maxi - Modulo Documentacion
-- Archivo consolidado para SQL Editor de Supabase
-- ============================================================
--
-- IMPORTANTE:
-- 1. Revisar antes de ejecutar.
-- 2. Ejecutar primero fuera de horario critico.
-- 3. No modifica partidos, resultados, categorias, equipos ni torneos.
-- 4. Crea tablas nuevas, vista, trigger, RPC y requisitos documentales.
-- 5. No habilita RLS.
--
-- ============================================================
-- 1. TABLAS, INDICES, VISTA Y TRIGGER
-- ============================================================

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

-- ============================================================
-- 2. RPC FUTURAS DE ESCRITURA CONTROLADA
-- ============================================================

create or replace function public.upsert_team_document_metadata(
  p_requirement_id uuid,
  p_organizacion_id uuid,
  p_torneo_id uuid,
  p_categoria_id uuid,
  p_equipo_id uuid,
  p_equipo_nombre text,
  p_uploaded_by text,
  p_storage_path text,
  p_file_name text,
  p_file_type text,
  p_file_size bigint,
  p_vencimiento date default null
)
returns uuid
language plpgsql
as $$
declare
  v_document_id uuid;
begin
  insert into public.team_documents (
    requirement_id,
    organizacion_id,
    torneo_id,
    categoria_id,
    equipo_id,
    equipo_nombre,
    uploaded_by,
    storage_path,
    file_name,
    file_type,
    file_size,
    status,
    vencimiento,
    observacion
  )
  values (
    p_requirement_id,
    p_organizacion_id,
    p_torneo_id,
    p_categoria_id,
    p_equipo_id,
    p_equipo_nombre,
    p_uploaded_by,
    p_storage_path,
    p_file_name,
    p_file_type,
    p_file_size,
    'cargado',
    p_vencimiento,
    'Archivo cargado. Esperando revision.'
  )
  returning id into v_document_id;

  insert into public.document_events (
    team_document_id,
    event_type,
    actor,
    detail
  )
  values (
    v_document_id,
    'uploaded',
    p_uploaded_by,
    'Archivo cargado por delegado'
  );

  return v_document_id;
end;
$$;

create or replace function public.review_team_document(
  p_document_id uuid,
  p_status text,
  p_actor text,
  p_observacion text default null
)
returns boolean
language plpgsql
as $$
begin
  if p_status not in ('aprobado', 'observado', 'rechazado') then
    raise exception 'Estado de revision invalido: %', p_status;
  end if;

  update public.team_documents
  set
    status = p_status,
    observacion = coalesce(p_observacion, observacion),
    reviewed_by = p_actor,
    reviewed_at = now()
  where id = p_document_id;

  if not found then
    raise exception 'Documento no encontrado: %', p_document_id;
  end if;

  insert into public.document_events (
    team_document_id,
    event_type,
    actor,
    detail
  )
  values (
    p_document_id,
    p_status,
    p_actor,
    coalesce(p_observacion, 'Revision administrativa')
  );

  return true;
end;
$$;

create or replace function public.create_document_reminder(
  p_document_id uuid,
  p_actor text,
  p_detail text default 'Recordatorio generado'
)
returns boolean
language plpgsql
as $$
begin
  insert into public.document_events (
    team_document_id,
    event_type,
    actor,
    detail
  )
  values (
    p_document_id,
    'reminder_created',
    p_actor,
    p_detail
  );

  return true;
end;
$$;

-- ============================================================
-- 3. SEED APDB 2026
-- ============================================================

insert into public.document_requirements (
  organizacion_id,
  torneo_id,
  categoria_id,
  nombre,
  descripcion,
  obligatorio,
  requiere_vencimiento,
  activo
)
select
  seed.organizacion_id::uuid,
  seed.torneo_id::uuid,
  seed.categoria_id::uuid,
  seed.nombre,
  seed.descripcion,
  seed.obligatorio,
  seed.requiere_vencimiento,
  seed.activo
from (
values
  (
    '4fc0ec74-71d3-43cc-9509-f788aceaedf1',
    '7d0971e3-66ee-4791-bcbf-bace1d2fefb9',
    null,
    'Lista de buena fe',
    'Nomina oficial del equipo.',
    true,
    false,
    true
  ),
  (
    '4fc0ec74-71d3-43cc-9509-f788aceaedf1',
    '7d0971e3-66ee-4791-bcbf-bace1d2fefb9',
    null,
    'Certificado medico',
    'Apto medico de jugadores.',
    true,
    true,
    true
  ),
  (
    '4fc0ec74-71d3-43cc-9509-f788aceaedf1',
    '7d0971e3-66ee-4791-bcbf-bace1d2fefb9',
    null,
    'Seguro',
    'Cobertura vigente del equipo o jugadores.',
    true,
    true,
    true
  ),
  (
    '4fc0ec74-71d3-43cc-9509-f788aceaedf1',
    '7d0971e3-66ee-4791-bcbf-bace1d2fefb9',
    null,
    'Declaracion jurada',
    'Declaracion requerida por la Asociacion.',
    true,
    false,
    true
  ),
  (
    '4fc0ec74-71d3-43cc-9509-f788aceaedf1',
    '7d0971e3-66ee-4791-bcbf-bace1d2fefb9',
    null,
    'Imagenes para redes',
    'Material visual autorizado para comunicacion y redes.',
    false,
    false,
    true
  ),
  (
    '4fc0ec74-71d3-43cc-9509-f788aceaedf1',
    '7d0971e3-66ee-4791-bcbf-bace1d2fefb9',
    null,
    'Pase',
    'Pase o autorizacion administrativa del jugador.',
    true,
    false,
    true
  )
) as seed(organizacion_id, torneo_id, categoria_id, nombre, descripcion, obligatorio, requiere_vencimiento, activo)
where not exists (
  select 1
  from public.document_requirements dr
  where dr.torneo_id = seed.torneo_id::uuid
    and dr.categoria_id is null
    and lower(dr.nombre) = lower(seed.nombre)
);

-- ============================================================
-- 4. CONSULTAS DE VERIFICACION
-- ============================================================

select
  dr.id,
  dr.nombre,
  dr.descripcion,
  dr.obligatorio,
  dr.requiere_vencimiento,
  c.nombre as categoria_nombre,
  t.nombre as torneo_nombre
from public.document_requirements dr
left join public.categorias c on c.id = dr.categoria_id
left join public.torneos t on t.id = dr.torneo_id
where dr.activo = true
order by c.nombre nulls first, dr.nombre;

select
  status,
  count(*) as cantidad
from public.team_documents
group by status
order by status;
