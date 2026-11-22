-- Reconciliation marker for the administrative RPCs already installed in staging.
-- This migration is intentionally non-destructive: it validates the security
-- contract and never replaces functions or changes data.
begin;

do $$
declare
  v_oid oid;
  v_acl text;
  v_config text[];
  v_owner name;
  v_definition text;
begin
  foreach v_oid in array array[
    'public.apdb_ensure_tournament_category_teams(text,text,text,jsonb)'::regprocedure::oid,
    'public.apdb_set_delegate_scope(uuid,uuid,uuid,uuid,boolean,boolean)'::regprocedure::oid,
    'public.apdb_revoke_delegate_scope(uuid)'::regprocedure::oid
  ] loop
    select proowner::regrole::name, proconfig, pg_get_functiondef(oid)
      into v_owner, v_config, v_definition
    from pg_proc
    where oid = v_oid;

    if v_owner <> 'postgres' then
      raise exception 'APDB administrative RPC owner drift: %', v_oid;
    end if;
    if not exists (select 1 from pg_proc where oid = v_oid and prosecdef) then
      raise exception 'APDB administrative RPC is not SECURITY DEFINER: %', v_oid;
    end if;
    if v_config is distinct from array['search_path=public, auth, pg_temp']::text[] then
      raise exception 'APDB administrative RPC search_path drift: %', v_oid;
    end if;
    if has_function_privilege('anon', v_oid, 'execute') then
      raise exception 'APDB administrative RPC exposed to anon: %', v_oid;
    end if;
    if not has_function_privilege('authenticated', v_oid, 'execute') then
      raise exception 'APDB administrative RPC unavailable to authenticated: %', v_oid;
    end if;
  end loop;

  select pg_get_functiondef('public.apdb_revoke_delegate_scope(uuid)'::regprocedure)
    into v_definition;
  if v_definition not like '%target.role = ''delegado''%' or
     v_definition not like '%p.torneo_id is not null%' or
     v_definition not like '%p.categoria_id is not null%' or
     v_definition not like '%p.equipo_id is not null%' then
    raise exception 'APDB delegate revoke scope guard drift';
  end if;
end;
$$;

commit;
