-- APdB Liga Maxi - RPC futuras para modulo documentacion
-- Borrador. No ejecutar sin revisar permisos, RLS y pruebas.

-- Registrar o reemplazar metadata de un documento cargado.
-- El archivo debe subirse primero a Supabase Storage.
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

-- Cambiar estado desde Asociacion.
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

-- Registrar recordatorio sin cambiar estado.
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

