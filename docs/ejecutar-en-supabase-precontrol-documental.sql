-- APdB Liga Maxi - Precontrol documental sin IA
-- Permite que la carga de documentos de jugador guarde un precontrol automatico
-- en observacion. No aprueba automaticamente y no toca documentos existentes.

create or replace function public.mark_player_document_uploaded(
  p_document_id uuid,
  p_uploaded_by text,
  p_storage_path text,
  p_file_name text,
  p_file_type text,
  p_file_size bigint,
  p_vencimiento date default null,
  p_observacion text default null
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
    observacion = coalesce(nullif(trim(p_observacion), ''), 'Archivo cargado. Esperando revision.')
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
    coalesce(nullif(trim(p_observacion), ''), 'Archivo cargado por delegado')
  );

  return true;
end;
$$;

grant execute on function public.mark_player_document_uploaded(
  uuid,
  text,
  text,
  text,
  text,
  bigint,
  date,
  text
) to anon, authenticated;

select
  'mark_player_document_uploaded_v2' as funcion,
  'ok' as estado;
