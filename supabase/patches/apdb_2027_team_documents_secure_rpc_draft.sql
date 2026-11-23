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
-- ALTER VIEW public.v_team_documents_admin RESET (security_invoker);
-- GRANT SELECT ON TABLE public.v_team_documents_admin TO authenticated;
-- COMMIT;
