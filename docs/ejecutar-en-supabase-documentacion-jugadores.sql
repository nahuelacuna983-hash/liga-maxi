-- APdB Liga Maxi - Documentacion por jugador
-- Ejecutar completo en Supabase SQL Editor, en una consulta nueva.
--
-- Objetivo:
-- 1) crear jugadores por equipo;
-- 2) crear documentos individuales por jugador;
-- 3) permitir carga, vista y revision administrativa.
--
-- No toca partidos, resultados, fixtures, categorias ni documentos de equipo existentes.

create table if not exists public.team_players (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid references public.organizaciones(id),
  torneo_id uuid references public.torneos(id),
  categoria_id uuid references public.categorias(id),
  equipo_id uuid references public.equipos(id),
  equipo_nombre text not null,
  nombre text not null,
  dni text,
  dorsal text,
  activo boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_documents (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.team_players(id) on delete cascade,
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
  constraint player_documents_status_check
    check (status in ('pendiente', 'cargado', 'observado', 'aprobado', 'rechazado', 'vencido')),
  constraint player_documents_unique_requirement
    unique (player_id, requirement_id)
);

create table if not exists public.player_document_events (
  id uuid primary key default gen_random_uuid(),
  player_document_id uuid references public.player_documents(id) on delete cascade,
  event_type text not null,
  actor text,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists idx_team_players_categoria_equipo
  on public.team_players(categoria_id, equipo_id);

create index if not exists idx_player_documents_player
  on public.player_documents(player_id);

create index if not exists idx_player_documents_categoria_equipo
  on public.player_documents(categoria_id, equipo_id);

create index if not exists idx_player_documents_status
  on public.player_documents(status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_team_players_updated_at on public.team_players;

create trigger trg_team_players_updated_at
before update on public.team_players
for each row
execute function public.set_updated_at();

drop trigger if exists trg_player_documents_updated_at on public.player_documents;

create trigger trg_player_documents_updated_at
before update on public.player_documents
for each row
execute function public.set_updated_at();

create or replace function public.ensure_player_documents(p_player_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.team_players%rowtype;
  v_inserted integer := 0;
begin
  select *
  into v_player
  from public.team_players
  where id = p_player_id;

  if not found then
    raise exception 'Jugador no encontrado: %', p_player_id;
  end if;

  insert into public.player_documents (
    player_id,
    requirement_id,
    organizacion_id,
    torneo_id,
    categoria_id,
    equipo_id,
    equipo_nombre,
    status,
    observacion
  )
  select
    v_player.id,
    dr.id,
    dr.organizacion_id,
    dr.torneo_id,
    v_player.categoria_id,
    v_player.equipo_id,
    v_player.equipo_nombre,
    'pendiente',
    'Pendiente de carga.'
  from public.document_requirements dr
  where dr.activo = true
    and dr.scope = 'player'
    and (dr.categoria_id is null or dr.categoria_id = v_player.categoria_id)
    and (dr.torneo_id is null or dr.torneo_id = v_player.torneo_id)
  on conflict (player_id, requirement_id) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create or replace function public.add_team_player(
  p_organizacion_id uuid,
  p_torneo_id uuid,
  p_categoria_id uuid,
  p_equipo_id uuid,
  p_equipo_nombre text,
  p_nombre text,
  p_dni text default null,
  p_dorsal text default null,
  p_created_by text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
begin
  if nullif(trim(p_nombre), '') is null then
    raise exception 'El nombre del jugador es obligatorio';
  end if;

  insert into public.team_players (
    organizacion_id,
    torneo_id,
    categoria_id,
    equipo_id,
    equipo_nombre,
    nombre,
    dni,
    dorsal,
    created_by
  )
  values (
    p_organizacion_id,
    p_torneo_id,
    p_categoria_id,
    p_equipo_id,
    p_equipo_nombre,
    trim(p_nombre),
    nullif(trim(p_dni), ''),
    nullif(trim(p_dorsal), ''),
    p_created_by
  )
  returning id into v_player_id;

  perform public.ensure_player_documents(v_player_id);
  return v_player_id;
end;
$$;

create or replace function public.mark_player_document_uploaded(
  p_document_id uuid,
  p_uploaded_by text,
  p_storage_path text,
  p_file_name text,
  p_file_type text,
  p_file_size bigint,
  p_vencimiento date default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.player_documents
  set
    uploaded_by = p_uploaded_by,
    storage_path = p_storage_path,
    file_name = p_file_name,
    file_type = p_file_type,
    file_size = p_file_size,
    status = 'cargado',
    vencimiento = p_vencimiento,
    observacion = 'Archivo cargado. Esperando revision.'
  where id = p_document_id;

  if not found then
    raise exception 'Documento de jugador no encontrado: %', p_document_id;
  end if;

  insert into public.player_document_events (
    player_document_id,
    event_type,
    actor,
    detail
  )
  values (
    p_document_id,
    'uploaded',
    p_uploaded_by,
    'Archivo cargado por delegado'
  );

  return true;
end;
$$;

create or replace function public.review_player_document(
  p_document_id uuid,
  p_status text,
  p_actor text,
  p_observacion text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('aprobado', 'observado', 'rechazado') then
    raise exception 'Estado de revision invalido: %', p_status;
  end if;

  update public.player_documents
  set
    status = p_status,
    observacion = coalesce(nullif(trim(p_observacion), ''), observacion),
    reviewed_by = p_actor,
    reviewed_at = now()
  where id = p_document_id;

  if not found then
    raise exception 'Documento de jugador no encontrado: %', p_document_id;
  end if;

  insert into public.player_document_events (
    player_document_id,
    event_type,
    actor,
    detail
  )
  values (
    p_document_id,
    p_status,
    p_actor,
    coalesce(nullif(trim(p_observacion), ''), 'Revision administrativa')
  );

  return true;
end;
$$;

create or replace view public.v_player_documents_admin as
select
  pd.id,
  pd.player_id,
  tp.nombre as jugador_nombre,
  tp.dni as jugador_dni,
  tp.dorsal as jugador_dorsal,
  pd.requirement_id,
  dr.nombre as requirement_nombre,
  pd.organizacion_id,
  o.nombre as organizacion_nombre,
  pd.torneo_id,
  t.nombre as torneo_nombre,
  pd.categoria_id,
  c.nombre as categoria_nombre,
  pd.equipo_id,
  pd.equipo_nombre,
  pd.uploaded_by,
  pd.storage_path,
  pd.file_name,
  pd.file_type,
  pd.file_size,
  pd.status,
  pd.vencimiento,
  pd.observacion,
  pd.reviewed_by,
  pd.reviewed_at,
  pd.created_at,
  pd.updated_at
from public.player_documents pd
join public.team_players tp on tp.id = pd.player_id
left join public.document_requirements dr on dr.id = pd.requirement_id
left join public.organizaciones o on o.id = pd.organizacion_id
left join public.torneos t on t.id = pd.torneo_id
left join public.categorias c on c.id = pd.categoria_id
where tp.activo = true;

grant execute on function public.ensure_player_documents(uuid) to anon, authenticated;
grant execute on function public.add_team_player(uuid, uuid, uuid, uuid, text, text, text, text, text) to anon, authenticated;
grant execute on function public.mark_player_document_uploaded(uuid, text, text, text, text, bigint, date) to anon, authenticated;
grant execute on function public.review_player_document(uuid, text, text, text) to anon, authenticated;

select
  'team_players' as tabla,
  count(*) as registros
from public.team_players
union all
select
  'player_documents' as tabla,
  count(*) as registros
from public.player_documents;
