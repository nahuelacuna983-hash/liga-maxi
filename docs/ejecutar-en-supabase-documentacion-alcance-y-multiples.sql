-- APdB Liga Maxi - Paso 5 documental: alcance y multiples archivos
-- Ejecutar completo en Supabase SQL Editor, en una consulta nueva.
--
-- Objetivo:
-- 1) marcar requisitos por equipo o por jugador;
-- 2) permitir multiples archivos para "Imagenes para redes";
-- 3) registrar cada archivo adicional sin pisar los anteriores.
--
-- No toca partidos, resultados, fixtures, categorias, delegados ni claves.

alter table public.document_requirements
add column if not exists scope text not null default 'team';

alter table public.document_requirements
add column if not exists allows_multiple_files boolean not null default false;

alter table public.document_requirements
drop constraint if exists document_requirements_scope_check;

alter table public.document_requirements
add constraint document_requirements_scope_check
check (scope in ('team', 'player'));

update public.document_requirements
set
  nombre = 'Certificado medico y estudio complementario',
  descripcion = 'Certificado medico y estudio complementario por jugador.',
  scope = 'player',
  allows_multiple_files = false
where lower(nombre) = lower('Certificado medico')
  and torneo_id = '7d0971e3-66ee-4791-bcbf-bace1d2fefb9'::uuid;

update public.document_requirements
set
  descripcion = 'Declaracion jurada requerida por jugador.',
  scope = 'player',
  allows_multiple_files = false
where lower(nombre) = lower('Declaracion jurada')
  and torneo_id = '7d0971e3-66ee-4791-bcbf-bace1d2fefb9'::uuid;

update public.document_requirements
set
  descripcion = 'Pase o autorizacion administrativa por jugador.',
  scope = 'player',
  allows_multiple_files = false
where lower(nombre) = lower('Pase')
  and torneo_id = '7d0971e3-66ee-4791-bcbf-bace1d2fefb9'::uuid;

update public.document_requirements
set
  descripcion = 'Material visual autorizado para comunicacion y redes. Permite multiples imagenes.',
  scope = 'team',
  allows_multiple_files = true
where lower(nombre) = lower('Imagenes para redes')
  and torneo_id = '7d0971e3-66ee-4791-bcbf-bace1d2fefb9'::uuid;

update public.document_requirements
set scope = 'team'
where scope is null;

create table if not exists public.document_files (
  id uuid primary key default gen_random_uuid(),
  team_document_id uuid not null references public.team_documents(id) on delete cascade,
  uploaded_by text,
  storage_path text not null,
  file_name text not null,
  file_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

create index if not exists idx_document_files_document
  on public.document_files(team_document_id);

create or replace function public.add_team_document_file(
  p_document_id uuid,
  p_uploaded_by text,
  p_storage_path text,
  p_file_name text,
  p_file_type text,
  p_file_size bigint
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_files_count integer;
begin
  insert into public.document_files (
    team_document_id,
    uploaded_by,
    storage_path,
    file_name,
    file_type,
    file_size
  )
  values (
    p_document_id,
    p_uploaded_by,
    p_storage_path,
    p_file_name,
    p_file_type,
    p_file_size
  );

  select count(*)
  into v_files_count
  from public.document_files
  where team_document_id = p_document_id;

  update public.team_documents
  set
    uploaded_by = p_uploaded_by,
    storage_path = p_storage_path,
    file_name = case
      when v_files_count = 1 then p_file_name
      else v_files_count::text || ' archivos'
    end,
    file_type = p_file_type,
    file_size = p_file_size,
    status = 'cargado',
    observacion = 'Archivo cargado. Esperando revision.'
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
    'file_added',
    p_uploaded_by,
    'Archivo agregado: ' || p_file_name
  );

  return true;
end;
$$;

grant execute on function public.add_team_document_file(
  uuid,
  text,
  text,
  text,
  text,
  bigint
) to anon, authenticated;

select
  nombre,
  scope,
  allows_multiple_files,
  descripcion
from public.document_requirements
where torneo_id = '7d0971e3-66ee-4791-bcbf-bace1d2fefb9'::uuid
order by scope, nombre;
