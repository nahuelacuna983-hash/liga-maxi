-- APdB Liga Maxi - Paso 4 documental: revision administrativa
-- Ejecutar completo en Supabase SQL Editor, en una consulta nueva.
--
-- Objetivo:
-- permitir que Asociacion marque documentos como aprobado, observado o rechazado.
--
-- No toca partidos, resultados, fixtures, categorias, delegados ni claves.
-- No hace publico el bucket.

create or replace function public.review_team_document(
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

  update public.team_documents
  set
    status = p_status,
    observacion = coalesce(nullif(trim(p_observacion), ''), observacion),
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
    coalesce(nullif(trim(p_observacion), ''), 'Revision administrativa')
  );

  return true;
end;
$$;

grant execute on function public.review_team_document(
  uuid,
  text,
  text,
  text
) to anon, authenticated;

select
  status,
  count(*) as cantidad
from public.team_documents
group by status
order by status;
