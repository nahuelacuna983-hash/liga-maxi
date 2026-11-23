-- APdB 2027: hosted staging RELEASE GATE / READ ONLY
-- Explicitly do not apply migrations when any required item returns false.
-- Review against the locked versioned release artifact and staging backup.
WITH checks AS (
 SELECT 'eligibility_events_table' item,
        to_regclass('public.apdb_player_eligibility_events') IS NOT NULL AS ready
 UNION ALL SELECT 'set_player_eligibility_rpc',
        to_regprocedure('public.apdb_set_player_eligibility(uuid,text,text)') IS NOT NULL
 UNION ALL SELECT 'review_player_document_rpc',
        EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                WHERE n.nspname='public' AND p.proname='review_player_document')
 UNION ALL SELECT 'secure_team_document_rpc',
        to_regprocedure('public.apdb_list_team_documents(uuid)') IS NOT NULL
 UNION ALL SELECT 'secure_player_document_rpc',
        to_regprocedure('public.apdb_list_player_documents(uuid)') IS NOT NULL
 UNION ALL SELECT 'team_view_invoker',
        EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                WHERE n.nspname='public' AND c.relname='v_team_documents_admin'
                  AND 'security_invoker=true'=ANY(c.reloptions))
 UNION ALL SELECT 'legacy_team_view_not_public',
        NOT has_table_privilege('authenticated','public.v_team_documents_admin','SELECT')
 UNION ALL SELECT 'legacy_player_view_not_public',
        NOT has_table_privilege('authenticated','public.v_player_documents_admin','SELECT')
 UNION ALL SELECT 'rls_event_trigger_anon_locked',
        NOT has_function_privilege('anon','public.rls_auto_enable()','EXECUTE')
)
SELECT item, ready FROM checks ORDER BY item;

-- Inventory counts only: no names, personal information or file contents.
SELECT
  (SELECT count(*) FROM public.torneos) tournaments,
  (SELECT count(*) FROM public.categorias) categories,
  (SELECT count(*) FROM public.equipos) teams,
  (SELECT count(*) FROM public.partidos) matches,
  (SELECT count(*) FROM public.team_players) players,
  (SELECT count(*) FROM public.team_documents) team_documents,
  (SELECT count(*) FROM public.player_documents) player_documents,
  (SELECT count(*) FROM storage.objects WHERE bucket_id='documentos') private_storage_objects,
  (SELECT count(*) FROM auth.users) auth_users;
