-- APdB Liga Maxi - Permitir vista de archivos documentales desde Asociacion
-- Ejecutar completo en Supabase SQL Editor, en una consulta nueva.
--
-- Objetivo:
-- permitir que la app cree URLs firmadas temporales para abrir archivos del bucket privado.
--
-- Nota:
-- El bucket sigue privado. La app genera enlaces temporales de 5 minutos.
-- Esta politica permite SELECT sobre objetos del bucket "documentos" con la anon key.
-- Es una seguridad basica compatible con la app actual; el paso profesional posterior
-- sera migrar Asociacion a login real de Supabase Auth.

drop policy if exists "Leer documentos de equipos" on storage.objects;

create policy "Leer documentos de equipos"
on storage.objects
for select
using (
  bucket_id = 'documentos'
);

select
  policyname,
  cmd,
  qual
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname = 'Leer documentos de equipos';
