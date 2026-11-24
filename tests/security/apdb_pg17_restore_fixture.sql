-- Synthetic only. Loaded into a disposable Supabase-compatible PG17 database.
\set ON_ERROR_STOP on
CREATE EXTENSION IF NOT EXISTS supabase_vault;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE TABLE public.apdb_restore_probe(id integer PRIMARY KEY, value text NOT NULL);
ALTER TABLE public.apdb_restore_probe ENABLE ROW LEVEL SECURITY;
CREATE POLICY apdb_restore_probe_authenticated ON public.apdb_restore_probe
  FOR SELECT TO authenticated USING (true);
CREATE OR REPLACE FUNCTION public.apdb_restore_probe_function() RETURNS text
LANGUAGE sql STABLE SET search_path = public AS $$ SELECT 'synthetic-ok'::text $$;
INSERT INTO public.apdb_restore_probe VALUES (1, 'synthetic-only');
