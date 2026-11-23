-- Isolated PostgreSQL fixture: synthetic schema only, never against real/staging.
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE SCHEMA IF NOT EXISTS auth;
GRANT USAGE ON SCHEMA auth TO authenticated, anon;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;

CREATE TABLE public.organizaciones (id uuid PRIMARY KEY, nombre text, slug text);
CREATE TABLE public.torneos (id uuid PRIMARY KEY, organizacion_id uuid, nombre text, temporada text);
CREATE TABLE public.categorias (id uuid PRIMARY KEY, torneo_id uuid, nombre text);
CREATE TABLE public.equipos (id uuid PRIMARY KEY, categoria_id uuid, nombre text);
CREATE TABLE public.app_users (
  id uuid PRIMARY KEY, auth_user_id uuid, organizacion_id uuid,
  active boolean NOT NULL DEFAULT true, role text NOT NULL
);
CREATE TABLE public.app_user_permissions (
  user_id uuid, organizacion_id uuid, categoria_id uuid, equipo_id uuid,
  can_view boolean, can_load_documents boolean
);
CREATE TABLE public.document_requirements (id uuid PRIMARY KEY, nombre text);

CREATE TABLE public.team_documents (
  id uuid PRIMARY KEY, requirement_id uuid, organizacion_id uuid,
  torneo_id uuid, categoria_id uuid, equipo_id uuid, equipo_nombre text,
  uploaded_by text, storage_path text, file_name text, file_type text,
  file_size bigint, status text, vencimiento date, observacion text,
  reviewed_by text, reviewed_at timestamptz, created_at timestamptz, updated_at timestamptz
);
CREATE TABLE public.team_players (
  id uuid PRIMARY KEY, categoria_id uuid, equipo_id uuid, nombre text,
  dni text, dorsal integer, baja_solicitada boolean, baja_motivo text,
  baja_solicitada_por text, baja_solicitada_en timestamptz, activo boolean
);
CREATE TABLE public.player_documents (
  id uuid PRIMARY KEY, player_id uuid, requirement_id uuid,
  organizacion_id uuid, torneo_id uuid, categoria_id uuid, equipo_id uuid,
  equipo_nombre text, uploaded_by text, storage_path text, file_name text,
  file_type text, file_size bigint, status text, vencimiento date,
  observacion text, reviewed_by text, reviewed_at timestamptz,
  created_at timestamptz, updated_at timestamptz
);
ALTER TABLE public.team_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_requirements ENABLE ROW LEVEL SECURITY;
-- Deliberately no SELECT grants to authenticated on the base tables.

CREATE FUNCTION public.apdb_document_access_allowed(
  p_organizacion_id uuid,p_categoria_id uuid,p_equipo_id uuid
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public,auth
AS $$
 SELECT EXISTS (
   SELECT 1 FROM public.app_users au
   WHERE au.auth_user_id=auth.uid() AND au.active
   AND (
     (au.role IN ('asociacion','admin_general') AND au.organizacion_id=p_organizacion_id)
     OR (au.role='delegado' AND EXISTS (
       SELECT 1 FROM public.app_user_permissions aup
       WHERE aup.user_id=au.id AND aup.organizacion_id=p_organizacion_id
         AND aup.categoria_id=p_categoria_id AND aup.equipo_id=p_equipo_id
         AND aup.can_view AND aup.can_load_documents))
   )
   AND EXISTS (
     SELECT 1 FROM public.categorias c
     JOIN public.torneos t ON t.id=c.torneo_id
     WHERE c.id=p_categoria_id AND t.organizacion_id=p_organizacion_id
   )
   AND EXISTS (
     SELECT 1 FROM public.equipos e
     WHERE e.id=p_equipo_id AND e.categoria_id=p_categoria_id
   )
 )
$$;

CREATE VIEW public.v_team_documents_admin WITH (security_barrier=true) AS
 SELECT td.id,td.requirement_id,dr.nombre requirement_nombre,
 td.organizacion_id,o.nombre organizacion_nombre,
 td.torneo_id,t.nombre torneo_nombre,
 td.categoria_id,c.nombre categoria_nombre,
 td.equipo_id,td.equipo_nombre,td.uploaded_by,td.storage_path,td.file_name,
 td.file_type,td.file_size,td.status,td.vencimiento,td.observacion,
 td.reviewed_by,td.reviewed_at,td.created_at,td.updated_at
 FROM public.team_documents td
 LEFT JOIN public.document_requirements dr ON dr.id=td.requirement_id
 LEFT JOIN public.organizaciones o ON o.id=td.organizacion_id
 LEFT JOIN public.torneos t ON t.id=td.torneo_id
 LEFT JOIN public.categorias c ON c.id=td.categoria_id
 WHERE public.apdb_document_access_allowed(td.organizacion_id,td.categoria_id,td.equipo_id);

CREATE VIEW public.v_player_documents_admin AS
 SELECT pd.id,pd.player_id,tp.nombre jugador_nombre,tp.dni jugador_dni,
 tp.dorsal jugador_dorsal,tp.baja_solicitada,tp.baja_motivo,
 tp.baja_solicitada_por,tp.baja_solicitada_en,
 pd.requirement_id,dr.nombre requirement_nombre,
 pd.organizacion_id,o.nombre organizacion_nombre,
 pd.torneo_id,t.nombre torneo_nombre,
 pd.categoria_id,c.nombre categoria_nombre,
 pd.equipo_id,pd.equipo_nombre,pd.uploaded_by,pd.storage_path,
 pd.file_name,pd.file_type,pd.file_size,pd.status,pd.vencimiento,
 pd.observacion,pd.reviewed_by,pd.reviewed_at,pd.created_at,pd.updated_at
 FROM public.player_documents pd
 JOIN public.team_players tp ON tp.id=pd.player_id
 LEFT JOIN public.document_requirements dr ON dr.id=pd.requirement_id
 LEFT JOIN public.organizaciones o ON o.id=pd.organizacion_id
 LEFT JOIN public.torneos t ON t.id=pd.torneo_id
 LEFT JOIN public.categorias c ON c.id=pd.categoria_id
 WHERE tp.activo=true;
GRANT SELECT ON public.v_team_documents_admin TO authenticated;

INSERT INTO public.organizaciones VALUES
 ('10000000-0000-0000-0000-000000000001','APdB A','apdb-a'),
 ('10000000-0000-0000-0000-000000000002','APdB B','apdb-b');
INSERT INTO public.torneos VALUES
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Liga A','2027'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','Liga B','2027');
INSERT INTO public.categorias VALUES
 ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','+35 A'),
 ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','+35 B');
INSERT INTO public.equipos VALUES
 ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','Equipo A'),
 ('40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','Equipo B');
INSERT INTO public.app_users (id,auth_user_id,organizacion_id,active,role) VALUES
 ('50000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',true,'asociacion'),
 ('50000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001',true,'delegado'),
 ('50000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002',true,'delegado'),
 ('50000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001',false,'delegado');
INSERT INTO public.app_user_permissions VALUES
 ('50000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',true,true),
 ('50000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002',true,true),
 ('50000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',true,true);
INSERT INTO public.document_requirements VALUES ('60000000-0000-0000-0000-000000000001','Certificado sintético');
INSERT INTO public.team_documents (id,requirement_id,organizacion_id,torneo_id,categoria_id,equipo_id,equipo_nombre,status,storage_path) VALUES
 ('70000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','Equipo A','en_revision','a/test.pdf'),
 ('70000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','Equipo B','en_revision','b/test.pdf');
INSERT INTO public.team_players (id,categoria_id,equipo_id,nombre,dni,activo) VALUES
 ('80000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','Jugador A','11111111',true),
 ('80000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','Jugador B','22222222',true);
INSERT INTO public.player_documents (id,player_id,requirement_id,organizacion_id,torneo_id,categoria_id,equipo_id,equipo_nombre,status,storage_path) VALUES
 ('90000000-0000-0000-0000-000000000001','80000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','Equipo A','en_revision','a/jugador.pdf'),
 ('90000000-0000-0000-0000-000000000002','80000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','Equipo B','en_revision','b/jugador.pdf');
