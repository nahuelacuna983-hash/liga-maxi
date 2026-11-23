-- Run only after apdb_document_rpc_fixture.sql and the candidate patch
-- on a NEW disposable PostgreSQL database. No personal information.
\set ON_ERROR_STOP on
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000002', false);
DO $$
DECLARE
  cat_a constant uuid := '30000000-0000-0000-0000-000000000001';
  cat_b constant uuid := '30000000-0000-0000-0000-000000000002';
BEGIN
  IF (SELECT count(*) FROM public.apdb_list_team_documents(cat_a)) <> 1 THEN
    RAISE EXCEPTION 'Delegate A cannot read own team documents';
  END IF;
  IF (SELECT count(*) FROM public.apdb_list_player_documents(cat_a)) <> 1 THEN
    RAISE EXCEPTION 'Delegate A cannot read own player documents';
  END IF;
  IF (SELECT count(*) FROM public.apdb_list_team_documents(cat_b)) <> 0
     OR (SELECT count(*) FROM public.apdb_list_player_documents(cat_b)) <> 0 THEN
    RAISE EXCEPTION 'CROSS_ORGANIZATION_DATA_EXPOSED';
  END IF;
END $$;

-- Change effective subject; token still valid but the user differs.
SELECT set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000003', false);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.apdb_list_team_documents('30000000-0000-0000-0000-000000000001')) <> 0
     OR (SELECT count(*) FROM public.apdb_list_player_documents('30000000-0000-0000-0000-000000000001')) <> 0 THEN
    RAISE EXCEPTION 'Delegate B read org A';
  END IF;
  IF (SELECT count(*) FROM public.apdb_list_team_documents('30000000-0000-0000-0000-000000000002')) <> 1 THEN
    RAISE EXCEPTION 'Delegate B cannot read own docs';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000004', false);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.apdb_list_team_documents('30000000-0000-0000-0000-000000000001')) <> 0
     OR (SELECT count(*) FROM public.apdb_list_player_documents('30000000-0000-0000-0000-000000000001')) <> 0 THEN
    RAISE EXCEPTION 'Deactivated delegate retained document access';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001', false);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.apdb_list_team_documents('30000000-0000-0000-0000-000000000001')) <> 1 THEN
    RAISE EXCEPTION 'Association A rejected';
  END IF;
  IF (SELECT count(*) FROM public.apdb_list_team_documents('30000000-0000-0000-0000-000000000002')) <> 0 THEN
    RAISE EXCEPTION 'Association A reads organization B';
  END IF;
END $$;

-- Direct legacy view access must be revoked, even for authenticated users.
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.v_team_documents_admin LIMIT 1;
    RAISE EXCEPTION 'Legacy team view unexpectedly readable';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM 1 FROM public.v_player_documents_admin LIMIT 1;
    RAISE EXCEPTION 'Legacy player view unexpectedly readable';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

RESET ROLE;
SET ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.apdb_list_team_documents('30000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'Anonymous can invoke team RPC';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM 1 FROM public.apdb_list_player_documents('30000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'Anonymous can invoke player RPC';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;
SELECT 'APDB_DOCUMENT_RPC_POSTGRES_ISOLATION_OK' AS result;
