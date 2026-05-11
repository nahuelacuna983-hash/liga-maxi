-- APdB Liga Maxi - Paso 3 documental: subida controlada
-- Ejecutar completo en Supabase SQL Editor, en una consulta nueva.
--
-- Objetivo:
-- 1) crear/verificar bucket privado "documentos";
-- 2) permitir subida de PDF/JPG/PNG al bucket;
-- 3) crear RPC para marcar un pendiente como "cargado" con metadata del archivo.
--
-- No toca partidos, resultados, fixtures, categorias, delegados ni claves.
-- No hace publico el bucket.
-- No habilita descarga publica de archivos.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'documentos',
  'documentos',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Subir documentos de equipos" on storage.objects;

create policy "Subir documentos de equipos"
on storage.objects
for insert
with check (
  bucket_id = 'documentos'
);

drop policy if exists "Leer documentos de equipos" on storage.objects;

-- No crear politica SELECT todavia.
-- La descarga/visualizacion debe resolverse luego con URLs firmadas y permisos administrativos.

create or replace function public.mark_team_document_uploaded(
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
  update public.team_documents
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
    'uploaded',
    p_uploaded_by,
    'Archivo cargado por delegado'
  );

  return true;
end;
$$;

grant execute on function public.mark_team_document_uploaded(
  uuid,
  text,
  text,
  text,
  text,
  bigint,
  date
) to anon, authenticated;

select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id = 'documentos';
