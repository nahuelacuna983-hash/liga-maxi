-- APdB 2027 · Draft patch for isolated database acceptance ONLY.
-- Do not run against persistent staging until the full backend/frontend release passes
-- negative tests and receives separate authorization.
-- Expected PostgreSQL >= 15. Uses the existing view's row type, with a SECURITY DEFINER
-- RPC that reads base tables and applies the existing per-team authorization predicate.
BEGIN;

CREATE OR REPLACE FUNCTION public.apdb_list_team_documents(p_categoria_id uuid)
RETURNS SETOF public.v_team_documents_admin
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $fn$
BEGIN
  -- Explicit deny if no verified identity or invalid category.
  IF auth.uid() IS NULL OR p_categoria_id IS NULL THEN
    RAISE EXCEPTION 'APDB_DOCUMENT_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT td.id,
         td.requirement_id,
         dr.nombre AS requirement_nombre,
         td.organizacion_id,
         org.nombre AS organizacion_nombre,
         td.torneo_id,
         t.nombre AS torneo_nombre,
         td.categoria_id,
         c.nombre AS categoria_nombre,
         td.equipo_id,
         td.equipo_nombre,
         td.uploaded_by,
         td.storage_path,
         td.file_name,
         td.file_type,
         td.file_size,
         td.status,
         td.vencimiento,
         td.observacion,
         td.reviewed_by,
         td.reviewed_at,
         td.created_at,
         td.updated_at
  FROM public.team_documents td
  LEFT JOIN public.document_requirements dr ON dr.id = td.requirement_id
  LEFT JOIN public.organizaciones org ON org.id = td.organizacion_id
  LEFT JOIN public.torneos t ON t.id = td.torneo_id
  LEFT JOIN public.categorias c ON c.id = td.categoria_id
  WHERE td.categoria_id = p_categoria_id
    AND public.apdb_document_access_allowed(td.organizacion_id, td.categoria_id, td.equipo_id);
END;
$fn$;

-- Player documents: must not be exposed through the legacy unscoped view.
-- This RPC returns only active players' documents within an authorized team.
CREATE OR REPLACE FUNCTION public.apdb_list_player_documents(p_categoria_id uuid)
RETURNS SETOF public.v_player_documents_admin
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $fn$
BEGIN
  IF auth.uid() IS NULL OR p_categoria_id IS NULL THEN
    RAISE EXCEPTION 'APDB_DOCUMENT_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT pd.id,
         pd.player_id,
         tp.nombre AS jugador_nombre,
         tp.dni AS jugador_dni,
         tp.dorsal AS jugador_dorsal,
         tp.baja_solicitada,
         tp.baja_motivo,
         tp.baja_solicitada_por,
         tp.baja_solicitada_en,
         pd.requirement_id,
         dr.nombre AS requirement_nombre,
         pd.organizacion_id,
         org.nombre AS organizacion_nombre,
         pd.torneo_id,
         t.nombre AS torneo_nombre,
         pd.categoria_id,
         c.nombre AS categoria_nombre,
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
  FROM public.player_documents pd
  JOIN public.team_players tp ON tp.id = pd.player_id
  LEFT JOIN public.document_requirements dr ON dr.id = pd.requirement_id
  LEFT JOIN public.organizaciones org ON org.id = pd.organizacion_id
  LEFT JOIN public.torneos t ON t.id = pd.torneo_id
  LEFT JOIN public.categorias c ON c.id = pd.categoria_id
  WHERE pd.categoria_id = p_categoria_id
    AND tp.activo = true
    AND tp.equipo_id = pd.equipo_id
    AND tp.categoria_id = pd.categoria_id
    AND public.apdb_document_access_allowed(pd.organizacion_id, pd.categoria_id, pd.equipo_id);
END;
$fn$;

REVOKE ALL ON FUNCTION public.apdb_list_player_documents(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apdb_list_player_documents(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.apdb_list_player_documents(uuid) TO authenticated;

-- Do not expose either owner-privileged document view to API clients.
ALTER VIEW public.v_player_documents_admin SET (security_invoker = true);
REVOKE ALL ON TABLE public.v_player_documents_admin FROM PUBLIC;
REVOKE ALL ON TABLE public.v_player_documents_admin FROM anon;
REVOKE ALL ON TABLE public.v_player_documents_admin FROM authenticated;

REVOKE ALL ON FUNCTION public.apdb_list_team_documents(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apdb_list_team_documents(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.apdb_list_team_documents(uuid) TO authenticated;

-- Replace the default owner-privileged behavior and prevent API clients
-- from bypassing the category-bound RPC by selecting the view directly.
ALTER VIEW public.v_team_documents_admin SET (security_invoker = true);
REVOKE ALL ON TABLE public.v_team_documents_admin FROM PUBLIC;
REVOKE ALL ON TABLE public.v_team_documents_admin FROM anon;
REVOKE ALL ON TABLE public.v_team_documents_admin FROM authenticated;

COMMIT;

-- Rollback requires a coordinated frontend reversal or compatibility bridge.
-- BEGIN;
-- REVOKE ALL ON FUNCTION public.apdb_list_team_documents(uuid) FROM authenticated;
-- DROP FUNCTION public.apdb_list_team_documents(uuid);
-- REVOKE ALL ON FUNCTION public.apdb_list_player_documents(uuid) FROM authenticated;
-- DROP FUNCTION public.apdb_list_player_documents(uuid);
-- ALTER VIEW public.v_player_documents_admin RESET (security_invoker);
-- ALTER VIEW public.v_team_documents_admin RESET (security_invoker);
-- GRANT SELECT ON TABLE public.v_team_documents_admin TO authenticated;
-- COMMIT;
