-- APdB 2027 / integrity gate for staging. READ ONLY.
-- Do not export row contents, names or Storage paths. These counts are metadata only.
SELECT
  (SELECT count(*) FROM public.team_documents) AS team_document_rows,
  (SELECT count(*) FROM public.team_documents WHERE nullif(btrim(storage_path),'') IS NOT NULL) AS team_docs_with_paths,
  (SELECT count(*)
   FROM public.team_documents td
   WHERE nullif(btrim(td.storage_path),'') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM storage.objects so
       WHERE so.bucket_id='documentos' AND so.name=td.storage_path
     )) AS unresolved_team_document_paths,
  (SELECT count(*) FROM public.player_documents) AS player_document_rows,
  (SELECT count(*)
   FROM public.player_documents pd
   WHERE nullif(btrim(pd.storage_path),'') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM storage.objects so
       WHERE so.bucket_id='documentos' AND so.name=pd.storage_path
     )) AS unresolved_player_document_paths,
  (SELECT count(*) FROM storage.objects WHERE bucket_id='documentos') AS bucket_object_count;
