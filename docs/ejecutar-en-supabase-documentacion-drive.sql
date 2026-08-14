-- Gestor de Torneos - Documentacion desde Google Drive
-- Ejecutar completo en Supabase SQL Editor.
--
-- Objetivo:
-- - guardar solo metadatos/enlaces de Drive;
-- - no subir archivos a Supabase Storage;
-- - no tocar documentos cargados por delegados;
-- - mantener todo visible solamente desde Asociacion/Admin.

create table if not exists public.drive_player_documents (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid references public.organizaciones(id),
  torneo_id uuid references public.torneos(id),
  categoria_id uuid references public.categorias(id),
  equipo_id uuid references public.equipos(id),
  equipo_nombre text,
  player_id uuid references public.team_players(id) on delete set null,
  player_name text,
  document_type text not null,
  title text not null,
  drive_file_id text not null,
  drive_url text not null,
  mime_type text,
  status text not null default 'cargado',
  observation text,
  match_status text not null default 'sin_asociar',
  source_folder text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint drive_player_documents_status_check
    check (status in ('cargado', 'pendiente', 'revisar', 'vencido')),
  constraint drive_player_documents_match_status_check
    check (match_status in ('exacto', 'dudoso', 'sin_jugador', 'sin_asociar')),
  constraint drive_player_documents_file_unique
    unique (drive_file_id, document_type)
);

create index if not exists idx_drive_player_documents_categoria
  on public.drive_player_documents(categoria_id);

create index if not exists idx_drive_player_documents_player
  on public.drive_player_documents(player_id);

create index if not exists idx_drive_player_documents_status
  on public.drive_player_documents(status);

create index if not exists idx_drive_player_documents_match_status
  on public.drive_player_documents(match_status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_drive_player_documents_updated_at on public.drive_player_documents;

create trigger trg_drive_player_documents_updated_at
before update on public.drive_player_documents
for each row
execute function public.set_updated_at();

create or replace view public.v_drive_player_documents_admin as
select
  dpd.id,
  dpd.organizacion_id,
  o.nombre as organizacion_nombre,
  dpd.torneo_id,
  t.nombre as torneo_nombre,
  dpd.categoria_id,
  c.nombre as categoria_nombre,
  dpd.equipo_id,
  dpd.equipo_nombre,
  dpd.player_id,
  coalesce(tp.nombre, dpd.player_name) as player_name,
  tp.dni as player_dni,
  tp.dorsal as player_dorsal,
  dpd.document_type,
  dpd.title,
  dpd.drive_file_id,
  dpd.drive_url,
  dpd.mime_type,
  dpd.status,
  dpd.observation,
  dpd.match_status,
  dpd.source_folder,
  dpd.reviewed_by,
  dpd.reviewed_at,
  dpd.created_at,
  dpd.updated_at
from public.drive_player_documents dpd
left join public.team_players tp on tp.id = dpd.player_id
left join public.organizaciones o on o.id = dpd.organizacion_id
left join public.torneos t on t.id = dpd.torneo_id
left join public.categorias c on c.id = dpd.categoria_id;

create or replace function public.review_drive_player_document(
  p_document_id uuid,
  p_status text,
  p_match_status text,
  p_player_id uuid default null,
  p_player_name text default null,
  p_observation text default null,
  p_actor text default 'ADMIN'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('cargado', 'pendiente', 'revisar', 'vencido') then
    raise exception 'Estado documental invalido: %', p_status;
  end if;

  if p_match_status not in ('exacto', 'dudoso', 'sin_jugador', 'sin_asociar') then
    raise exception 'Estado de asociacion invalido: %', p_match_status;
  end if;

  update public.drive_player_documents
  set
    status = p_status,
    match_status = p_match_status,
    player_id = p_player_id,
    player_name = nullif(trim(p_player_name), ''),
    observation = nullif(trim(p_observation), ''),
    reviewed_by = p_actor,
    reviewed_at = now()
  where id = p_document_id;

  if not found then
    raise exception 'Documento de Drive no encontrado: %', p_document_id;
  end if;

  return true;
end;
$$;

create or replace function public.create_player_from_drive_review(
  p_document_id uuid,
  p_organizacion_id uuid,
  p_torneo_id uuid,
  p_categoria_id uuid,
  p_equipo_id uuid,
  p_equipo_nombre text,
  p_nombre text,
  p_actor text default 'ADMIN'
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
    created_by
  )
  values (
    p_organizacion_id,
    p_torneo_id,
    p_categoria_id,
    p_equipo_id,
    p_equipo_nombre,
    trim(p_nombre),
    p_actor
  )
  returning id into v_player_id;

  update public.drive_player_documents
  set
    player_id = v_player_id,
    player_name = trim(p_nombre),
    match_status = 'exacto',
    status = 'cargado',
    observation = coalesce(observation, 'Jugador creado desde revision admin de Drive. No genera habilitacion automatica.'),
    reviewed_by = p_actor,
    reviewed_at = now()
  where id = p_document_id;

  return v_player_id;
end;
$$;

grant select on public.v_drive_player_documents_admin to anon, authenticated;
grant execute on function public.review_drive_player_document(uuid, text, text, uuid, text, text, text) to anon, authenticated;
grant execute on function public.create_player_from_drive_review(uuid, uuid, uuid, uuid, uuid, text, text, text) to anon, authenticated;

select
  status,
  match_status,
  count(*) as cantidad
from public.drive_player_documents
group by status, match_status
order by status, match_status;
