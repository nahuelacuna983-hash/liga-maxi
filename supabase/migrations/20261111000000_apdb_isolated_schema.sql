-- Generated from the authorized metadata snapshot d143a0fe1958698b145259599899f1c1700e9d857fb54068ea40a8957eedaf86.
-- Isolated APdB baseline: original permissive policies and function bodies are not copied.
-- Auth users must be created by Supabase Auth; this migration never inserts auth.users.
begin;
create extension if not exists pgcrypto;
create table public."app_usage_events" (
  "id" uuid not null default gen_random_uuid(),
  "created_at" timestamptz not null default now(),
  "event_type" text not null,
  "area" text,
  "categoria_nombre" text,
  "equipo_nombre" text,
  "user_role" text,
  "user_label" text,
  "session_id" text,
  "device_type" text,
  "path" text,
  "user_agent" text
);
create table public."app_user_permissions" (
  "id" uuid not null default gen_random_uuid(),
  "user_id" uuid not null,
  "organizacion_id" uuid,
  "torneo_id" uuid,
  "categoria_id" uuid,
  "equipo_id" uuid,
  "equipo_nombre" text,
  "can_view" boolean not null default true,
  "can_load_results" boolean not null default false,
  "can_load_documents" boolean not null default false,
  "can_review_documents" boolean not null default false,
  "can_correct_results" boolean not null default false,
  "can_manage_tournaments" boolean not null default false,
  "can_manage_users" boolean not null default false,
  "can_emergency_override" boolean not null default false,
  "created_at" timestamptz not null default now()
);
create table public."app_users" (
  "id" uuid not null default gen_random_uuid(),
  "auth_user_id" uuid,
  "organizacion_id" uuid,
  "display_name" text not null,
  "email" text,
  "role" text not null,
  "legacy_key" text,
  "active" boolean not null default true,
  "emergency_access" boolean not null default false,
  "notes" text,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);
create table public."auditoria_resultados" (
  "id" uuid not null default gen_random_uuid(),
  "partido_id" uuid not null,
  "delegado_id" uuid,
  "puntos_local" integer,
  "puntos_visitante" integer,
  "accion" text not null default 'carga'::text,
  "created_at" timestamptz not null default now()
);
create table public."categorias" (
  "id" uuid not null default gen_random_uuid(),
  "torneo_id" uuid not null,
  "nombre" text not null,
  "estado" text not null default 'borrador'::text,
  "formato" text,
  "playoffs" boolean not null default false,
  "clasificados" integer,
  "dia_juego" integer,
  "fecha_inicio" date,
  "fecha_fin" date,
  "frecuencia" integer,
  "fechas_bloqueadas" jsonb not null default '[]'::jsonb,
  "series_playoff" jsonb not null default '{}'::jsonb,
  "created_at" timestamptz not null default now()
);
create table public."delegado_categorias" (
  "id" uuid not null default gen_random_uuid(),
  "delegado_id" uuid not null,
  "categoria_id" uuid not null,
  "created_at" timestamptz not null default now()
);
create table public."delegados" (
  "id" uuid not null default gen_random_uuid(),
  "auth_user_id" uuid,
  "nombre" text not null,
  "email" text not null,
  "activo" boolean not null default true,
  "created_at" timestamptz not null default now()
);
create table public."document_ai_audits" (
  "id" uuid not null default gen_random_uuid(),
  "scope" text not null,
  "team_document_id" uuid,
  "player_document_id" uuid,
  "organizacion_id" uuid,
  "torneo_id" uuid,
  "categoria_id" uuid,
  "equipo_id" uuid,
  "equipo_nombre" text,
  "player_id" uuid,
  "player_name" text,
  "requirement_id" uuid,
  "requirement_nombre" text,
  "storage_path" text,
  "file_name" text,
  "file_type" text,
  "audit_status" text not null default 'pendiente'::text,
  "confidence" numeric,
  "summary" text,
  "findings" jsonb not null default '{}'::jsonb,
  "extracted_text" text,
  "detected_dates" jsonb not null default '[]'::jsonb,
  "valid_until" date,
  "checks" jsonb not null default '{}'::jsonb,
  "model" text,
  "raw_response" jsonb,
  "audited_by" text not null default 'auditoria-ia'::text,
  "audited_at" timestamptz not null default now(),
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "criteria_version" text not null default 'APDB_MAXI_2026_V1'::text,
  "unresolved_reason" text,
  "page_evidence" jsonb not null default '[]'::jsonb,
  "source_kind" text not null default 'supabase_storage'::text,
  "source_file_id" text,
  "source_file_url" text,
  "source_modified_at" timestamptz,
  "source_hash" text
);
create table public."document_audit_criteria_versions" (
  "version" text not null,
  "title" text not null,
  "criteria" jsonb not null default '{}'::jsonb,
  "active" boolean not null default true,
  "created_at" timestamptz not null default now()
);
create table public."document_audit_results" (
  "id" uuid not null default gen_random_uuid(),
  "organizacion_id" uuid,
  "torneo_id" uuid,
  "categoria_id" uuid,
  "categoria_nombre" text,
  "equipo_nombre" text not null,
  "player_id" uuid,
  "player_name" text,
  "alcance" text,
  "planilla_arbitro" text,
  "document_type" text not null,
  "declared_status" text,
  "located_status" text,
  "validated_status" text,
  "valid_until" text,
  "audit_status" text not null default 'pendiente'::text,
  "risk_level" text,
  "observation" text,
  "evidence_url" text,
  "source_sheet" text,
  "cutoff_date" date,
  "imported_by" text,
  "imported_at" timestamptz not null default now(),
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);
create table public."document_events" (
  "id" uuid not null default gen_random_uuid(),
  "team_document_id" uuid,
  "event_type" text not null,
  "actor" text,
  "detail" text,
  "created_at" timestamptz not null default now()
);
create table public."document_files" (
  "id" uuid not null default gen_random_uuid(),
  "team_document_id" uuid not null,
  "uploaded_by" text,
  "storage_path" text not null,
  "file_name" text not null,
  "file_type" text,
  "file_size" bigint,
  "created_at" timestamptz not null default now()
);
create table public."document_requirements" (
  "id" uuid not null default gen_random_uuid(),
  "organizacion_id" uuid,
  "torneo_id" uuid,
  "nombre" text not null,
  "descripcion" text,
  "categoria_id" uuid,
  "obligatorio" boolean not null default true,
  "requiere_vencimiento" boolean not null default false,
  "activo" boolean not null default true,
  "created_at" timestamptz not null default now(),
  "scope" text not null default 'team'::text,
  "allows_multiple_files" boolean not null default false
);
create table public."drive_player_documents" (
  "id" uuid not null default gen_random_uuid(),
  "organizacion_id" uuid,
  "torneo_id" uuid,
  "categoria_id" uuid,
  "equipo_id" uuid,
  "equipo_nombre" text,
  "player_id" uuid,
  "player_name" text,
  "document_type" text not null,
  "title" text not null,
  "drive_file_id" text not null,
  "drive_url" text not null,
  "mime_type" text,
  "status" text not null default 'cargado'::text,
  "observation" text,
  "match_status" text not null default 'sin_asociar'::text,
  "source_folder" text,
  "reviewed_by" text,
  "reviewed_at" timestamptz,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);
create table public."equipos" (
  "id" uuid not null default gen_random_uuid(),
  "categoria_id" uuid not null,
  "nombre" text not null,
  "orden_inicial" integer,
  "activo" boolean not null default true,
  "created_at" timestamptz not null default now()
);
create table public."fechas" (
  "id" uuid not null default gen_random_uuid(),
  "categoria_id" uuid not null,
  "numero" integer not null,
  "fecha_programada" date,
  "label" text,
  "bloqueada" boolean not null default false,
  "equipo_libre" text,
  "created_at" timestamptz not null default now()
);
create table public."fixtures_publicos" (
  "id" uuid not null default gen_random_uuid(),
  "categoria" text not null,
  "data" jsonb not null,
  "created_at" timestamptz default now()
);
create table public."match_schedules" (
  "id" uuid not null default gen_random_uuid(),
  "partido_id" uuid not null,
  "categoria_id" uuid not null,
  "categoria_nombre" text,
  "jornada" integer,
  "local" text not null,
  "visitante" text not null,
  "fecha_partido" date,
  "hora" time,
  "cancha" text,
  "estado" text not null default 'pendiente'::text,
  "observacion" text,
  "informado_por" text,
  "informado_en" timestamptz,
  "confirmado_por" text,
  "confirmado_en" timestamptz,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);
create table public."organizaciones" (
  "id" uuid not null default gen_random_uuid(),
  "nombre" text not null,
  "slug" text not null,
  "created_at" timestamptz not null default now()
);
create table public."partidos" (
  "id" uuid not null default gen_random_uuid(),
  "categoria_id" uuid not null,
  "fecha_id" uuid,
  "fase" text not null default 'regular'::text,
  "orden" integer,
  "local" text not null,
  "visitante" text not null,
  "puntos_local" integer,
  "puntos_visitante" integer,
  "estado_resultado" text not null default 'pendiente'::text,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "jornada" integer,
  "fecha" date,
  "libre" text,
  "cargado_por" text,
  "cargado_en" timestamp
);
create table public."player_document_events" (
  "id" uuid not null default gen_random_uuid(),
  "player_document_id" uuid,
  "event_type" text not null,
  "actor" text,
  "detail" text,
  "created_at" timestamptz not null default now()
);
create table public."player_documents" (
  "id" uuid not null default gen_random_uuid(),
  "player_id" uuid not null,
  "requirement_id" uuid not null,
  "organizacion_id" uuid,
  "torneo_id" uuid,
  "categoria_id" uuid,
  "equipo_id" uuid,
  "equipo_nombre" text not null,
  "uploaded_by" text,
  "storage_path" text,
  "file_name" text,
  "file_type" text,
  "file_size" bigint,
  "status" text not null default 'pendiente'::text,
  "vencimiento" date,
  "observacion" text,
  "reviewed_by" text,
  "reviewed_at" timestamptz,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);
create table public."playoff_matches" (
  "id" uuid not null default gen_random_uuid(),
  "categoria_id" uuid not null,
  "categoria_nombre" text,
  "fase" text not null,
  "llave" text not null,
  "titulo" text,
  "orden" integer not null default 0,
  "partido_numero" integer not null default 1,
  "fecha" date,
  "local" text not null,
  "visitante" text not null,
  "puntos_local" integer,
  "puntos_visitante" integer,
  "estado" text not null default 'pendiente'::text,
  "observacion" text,
  "cargado_por" text,
  "cargado_en" timestamptz,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);
create table public."result_change_logs" (
  "id" uuid not null default gen_random_uuid(),
  "partido_id" uuid not null,
  "categoria_id" uuid,
  "torneo_id" uuid,
  "categoria_nombre" text,
  "fase" text,
  "jornada" integer,
  "fecha" date,
  "local" text,
  "visitante" text,
  "puntos_local_anterior" integer,
  "puntos_visitante_anterior" integer,
  "estado_resultado_anterior" text,
  "cargado_por_anterior" text,
  "cargado_en_anterior" timestamptz,
  "puntos_local_nuevo" integer,
  "puntos_visitante_nuevo" integer,
  "estado_resultado_nuevo" text,
  "cargado_por_nuevo" text,
  "cargado_en_nuevo" timestamptz,
  "accion" text not null,
  "actor" text,
  "origen" text not null default 'trigger_partidos'::text,
  "detalle" jsonb not null default '{}'::jsonb,
  "created_at" timestamptz not null default now()
);
create table public."team_audit_closure_events" (
  "id" uuid not null default gen_random_uuid(),
  "organizacion_id" uuid not null,
  "torneo_id" uuid not null,
  "categoria_id" uuid not null,
  "equipo_id" uuid not null,
  "equipo_nombre_snapshot" text not null,
  "estado" text not null,
  "observacion" text,
  "resumen_snapshot" jsonb not null default '{}'::jsonb,
  "cerrado_por_user_id" uuid not null,
  "cerrado_por_nombre" text,
  "cerrado_en" timestamptz not null default now(),
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);
create table public."team_documents" (
  "id" uuid not null default gen_random_uuid(),
  "requirement_id" uuid not null,
  "organizacion_id" uuid,
  "torneo_id" uuid,
  "categoria_id" uuid,
  "equipo_id" uuid,
  "equipo_nombre" text not null,
  "uploaded_by" text,
  "storage_path" text,
  "file_name" text,
  "file_type" text,
  "file_size" bigint,
  "status" text not null default 'pendiente'::text,
  "vencimiento" date,
  "observacion" text,
  "reviewed_by" text,
  "reviewed_at" timestamptz,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);
create table public."team_players" (
  "id" uuid not null default gen_random_uuid(),
  "organizacion_id" uuid,
  "torneo_id" uuid,
  "categoria_id" uuid,
  "equipo_id" uuid,
  "equipo_nombre" text not null,
  "nombre" text not null,
  "dni" text,
  "dorsal" text,
  "activo" boolean not null default true,
  "created_by" text,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "baja_solicitada" boolean not null default false,
  "baja_motivo" text,
  "baja_solicitada_por" text,
  "baja_solicitada_en" timestamptz,
  "baja_resuelta_por" text,
  "baja_resuelta_en" timestamptz
);
create table public."torneos" (
  "id" uuid not null default gen_random_uuid(),
  "organizacion_id" uuid not null,
  "nombre" text not null,
  "temporada" text not null,
  "tipo" text,
  "estado" text not null default 'borrador'::text,
  "created_at" timestamptz not null default now()
);
alter table public."app_usage_events" add constraint "app_usage_events_pkey" PRIMARY KEY (id);
alter table public."app_user_permissions" add constraint "app_user_permissions_categoria_id_fkey" FOREIGN KEY (categoria_id) REFERENCES categorias(id);
alter table public."app_user_permissions" add constraint "app_user_permissions_equipo_id_fkey" FOREIGN KEY (equipo_id) REFERENCES equipos(id);
alter table public."app_user_permissions" add constraint "app_user_permissions_organizacion_id_fkey" FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id);
alter table public."app_user_permissions" add constraint "app_user_permissions_pkey" PRIMARY KEY (id);
alter table public."app_user_permissions" add constraint "app_user_permissions_torneo_id_fkey" FOREIGN KEY (torneo_id) REFERENCES torneos(id);
alter table public."app_user_permissions" add constraint "app_user_permissions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;
alter table public."app_users" add constraint "app_users_auth_user_id_key" UNIQUE (auth_user_id);
alter table public."app_users" add constraint "app_users_legacy_key_key" UNIQUE (legacy_key);
alter table public."app_users" add constraint "app_users_organizacion_id_fkey" FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id);
alter table public."app_users" add constraint "app_users_pkey" PRIMARY KEY (id);
alter table public."app_users" add constraint "app_users_role_check" CHECK ((role = ANY (ARRAY['admin_general'::text, 'asociacion'::text, 'delegado'::text, 'jugador'::text, 'publico'::text])));
alter table public."auditoria_resultados" add constraint "auditoria_resultados_delegado_id_fkey" FOREIGN KEY (delegado_id) REFERENCES delegados(id) ON DELETE SET NULL;
alter table public."auditoria_resultados" add constraint "auditoria_resultados_partido_id_fkey" FOREIGN KEY (partido_id) REFERENCES partidos(id) ON DELETE CASCADE;
alter table public."auditoria_resultados" add constraint "auditoria_resultados_pkey" PRIMARY KEY (id);
alter table public."categorias" add constraint "categorias_pkey" PRIMARY KEY (id);
alter table public."categorias" add constraint "categorias_torneo_id_fkey" FOREIGN KEY (torneo_id) REFERENCES torneos(id) ON DELETE CASCADE;
alter table public."delegado_categorias" add constraint "delegado_categorias_categoria_id_fkey" FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE;
alter table public."delegado_categorias" add constraint "delegado_categorias_delegado_id_categoria_id_key" UNIQUE (delegado_id, categoria_id);
alter table public."delegado_categorias" add constraint "delegado_categorias_delegado_id_fkey" FOREIGN KEY (delegado_id) REFERENCES delegados(id) ON DELETE CASCADE;
alter table public."delegado_categorias" add constraint "delegado_categorias_pkey" PRIMARY KEY (id);
alter table public."delegados" add constraint "delegados_auth_user_id_key" UNIQUE (auth_user_id);
alter table public."delegados" add constraint "delegados_email_key" UNIQUE (email);
alter table public."delegados" add constraint "delegados_pkey" PRIMARY KEY (id);
alter table public."document_ai_audits" add constraint "document_ai_audits_audit_status_check" CHECK ((audit_status = ANY (ARRAY['pendiente'::text, 'validado'::text, 'listo_aprobar'::text, 'revisar'::text, 'observado'::text, 'rechazado'::text, 'vencido'::text, 'error'::text])));
alter table public."document_ai_audits" add constraint "document_ai_audits_categoria_id_fkey" FOREIGN KEY (categoria_id) REFERENCES categorias(id);
alter table public."document_ai_audits" add constraint "document_ai_audits_document_check" CHECK ((((scope = 'team'::text) AND (team_document_id IS NOT NULL) AND (player_document_id IS NULL)) OR ((scope = 'player'::text) AND (player_document_id IS NOT NULL) AND (team_document_id IS NULL))));
alter table public."document_ai_audits" add constraint "document_ai_audits_equipo_id_fkey" FOREIGN KEY (equipo_id) REFERENCES equipos(id);
alter table public."document_ai_audits" add constraint "document_ai_audits_organizacion_id_fkey" FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id);
alter table public."document_ai_audits" add constraint "document_ai_audits_pkey" PRIMARY KEY (id);
alter table public."document_ai_audits" add constraint "document_ai_audits_player_document_id_fkey" FOREIGN KEY (player_document_id) REFERENCES player_documents(id) ON DELETE CASCADE;
alter table public."document_ai_audits" add constraint "document_ai_audits_player_id_fkey" FOREIGN KEY (player_id) REFERENCES team_players(id) ON DELETE SET NULL;
alter table public."document_ai_audits" add constraint "document_ai_audits_requirement_id_fkey" FOREIGN KEY (requirement_id) REFERENCES document_requirements(id);
alter table public."document_ai_audits" add constraint "document_ai_audits_scope_check" CHECK ((scope = ANY (ARRAY['team'::text, 'player'::text])));
alter table public."document_ai_audits" add constraint "document_ai_audits_team_document_id_fkey" FOREIGN KEY (team_document_id) REFERENCES team_documents(id) ON DELETE CASCADE;
alter table public."document_ai_audits" add constraint "document_ai_audits_torneo_id_fkey" FOREIGN KEY (torneo_id) REFERENCES torneos(id);
alter table public."document_audit_criteria_versions" add constraint "document_audit_criteria_versions_pkey" PRIMARY KEY (version);
alter table public."document_audit_results" add constraint "document_audit_results_categoria_id_fkey" FOREIGN KEY (categoria_id) REFERENCES categorias(id);
alter table public."document_audit_results" add constraint "document_audit_results_organizacion_id_fkey" FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id);
alter table public."document_audit_results" add constraint "document_audit_results_pkey" PRIMARY KEY (id);
alter table public."document_audit_results" add constraint "document_audit_results_player_id_fkey" FOREIGN KEY (player_id) REFERENCES team_players(id) ON DELETE SET NULL;
alter table public."document_audit_results" add constraint "document_audit_results_torneo_id_fkey" FOREIGN KEY (torneo_id) REFERENCES torneos(id);
alter table public."document_events" add constraint "document_events_pkey" PRIMARY KEY (id);
alter table public."document_events" add constraint "document_events_team_document_id_fkey" FOREIGN KEY (team_document_id) REFERENCES team_documents(id);
alter table public."document_files" add constraint "document_files_pkey" PRIMARY KEY (id);
alter table public."document_files" add constraint "document_files_team_document_id_fkey" FOREIGN KEY (team_document_id) REFERENCES team_documents(id) ON DELETE CASCADE;
alter table public."document_requirements" add constraint "document_requirements_categoria_id_fkey" FOREIGN KEY (categoria_id) REFERENCES categorias(id);
alter table public."document_requirements" add constraint "document_requirements_organizacion_id_fkey" FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id);
alter table public."document_requirements" add constraint "document_requirements_pkey" PRIMARY KEY (id);
alter table public."document_requirements" add constraint "document_requirements_scope_check" CHECK ((scope = ANY (ARRAY['team'::text, 'player'::text])));
alter table public."document_requirements" add constraint "document_requirements_torneo_id_fkey" FOREIGN KEY (torneo_id) REFERENCES torneos(id);
alter table public."drive_player_documents" add constraint "drive_player_documents_categoria_id_fkey" FOREIGN KEY (categoria_id) REFERENCES categorias(id);
alter table public."drive_player_documents" add constraint "drive_player_documents_equipo_id_fkey" FOREIGN KEY (equipo_id) REFERENCES equipos(id);
alter table public."drive_player_documents" add constraint "drive_player_documents_file_unique" UNIQUE (drive_file_id, document_type);
alter table public."drive_player_documents" add constraint "drive_player_documents_match_status_check" CHECK ((match_status = ANY (ARRAY['exacto'::text, 'dudoso'::text, 'sin_jugador'::text, 'sin_asociar'::text])));
alter table public."drive_player_documents" add constraint "drive_player_documents_organizacion_id_fkey" FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id);
alter table public."drive_player_documents" add constraint "drive_player_documents_pkey" PRIMARY KEY (id);
alter table public."drive_player_documents" add constraint "drive_player_documents_player_id_fkey" FOREIGN KEY (player_id) REFERENCES team_players(id) ON DELETE SET NULL;
alter table public."drive_player_documents" add constraint "drive_player_documents_status_check" CHECK ((status = ANY (ARRAY['cargado'::text, 'pendiente'::text, 'revisar'::text, 'vencido'::text])));
alter table public."drive_player_documents" add constraint "drive_player_documents_torneo_id_fkey" FOREIGN KEY (torneo_id) REFERENCES torneos(id);
alter table public."equipos" add constraint "equipos_categoria_id_fkey" FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE;
alter table public."equipos" add constraint "equipos_pkey" PRIMARY KEY (id);
alter table public."fechas" add constraint "fechas_categoria_id_fkey" FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE;
alter table public."fechas" add constraint "fechas_pkey" PRIMARY KEY (id);
alter table public."fixtures_publicos" add constraint "fixtures_publicos_pkey" PRIMARY KEY (id);
alter table public."match_schedules" add constraint "match_schedules_categoria_id_fkey" FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE;
alter table public."match_schedules" add constraint "match_schedules_estado_valid" CHECK ((estado = ANY (ARRAY['pendiente'::text, 'listo'::text, 'enviado'::text, 'confirmado'::text])));
alter table public."match_schedules" add constraint "match_schedules_partido_id_fkey" FOREIGN KEY (partido_id) REFERENCES partidos(id) ON DELETE CASCADE;
alter table public."match_schedules" add constraint "match_schedules_partido_unique" UNIQUE (partido_id);
alter table public."match_schedules" add constraint "match_schedules_pkey" PRIMARY KEY (id);
alter table public."organizaciones" add constraint "organizaciones_pkey" PRIMARY KEY (id);
alter table public."organizaciones" add constraint "organizaciones_slug_key" UNIQUE (slug);
alter table public."partidos" add constraint "partidos_categoria_id_fkey" FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE;
alter table public."partidos" add constraint "partidos_fecha_id_fkey" FOREIGN KEY (fecha_id) REFERENCES fechas(id) ON DELETE CASCADE;
alter table public."partidos" add constraint "partidos_pkey" PRIMARY KEY (id);
alter table public."player_document_events" add constraint "player_document_events_pkey" PRIMARY KEY (id);
alter table public."player_document_events" add constraint "player_document_events_player_document_id_fkey" FOREIGN KEY (player_document_id) REFERENCES player_documents(id) ON DELETE CASCADE;
alter table public."player_documents" add constraint "player_documents_categoria_id_fkey" FOREIGN KEY (categoria_id) REFERENCES categorias(id);
alter table public."player_documents" add constraint "player_documents_equipo_id_fkey" FOREIGN KEY (equipo_id) REFERENCES equipos(id);
alter table public."player_documents" add constraint "player_documents_organizacion_id_fkey" FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id);
alter table public."player_documents" add constraint "player_documents_pkey" PRIMARY KEY (id);
alter table public."player_documents" add constraint "player_documents_player_id_fkey" FOREIGN KEY (player_id) REFERENCES team_players(id) ON DELETE CASCADE;
alter table public."player_documents" add constraint "player_documents_requirement_id_fkey" FOREIGN KEY (requirement_id) REFERENCES document_requirements(id);
alter table public."player_documents" add constraint "player_documents_status_check" CHECK ((status = ANY (ARRAY['pendiente'::text, 'cargado'::text, 'observado'::text, 'aprobado'::text, 'rechazado'::text, 'vencido'::text])));
alter table public."player_documents" add constraint "player_documents_torneo_id_fkey" FOREIGN KEY (torneo_id) REFERENCES torneos(id);
alter table public."player_documents" add constraint "player_documents_unique_requirement" UNIQUE (player_id, requirement_id);
alter table public."playoff_matches" add constraint "playoff_matches_categoria_id_fkey" FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE;
alter table public."playoff_matches" add constraint "playoff_matches_pkey" PRIMARY KEY (id);
alter table public."playoff_matches" add constraint "playoff_matches_scores_valid" CHECK ((((puntos_local IS NULL) AND (puntos_visitante IS NULL)) OR ((puntos_local >= 0) AND (puntos_visitante >= 0))));
alter table public."playoff_matches" add constraint "playoff_matches_unique_match" UNIQUE (categoria_id, fase, llave, partido_numero);
alter table public."result_change_logs" add constraint "result_change_logs_partido_id_fkey" FOREIGN KEY (partido_id) REFERENCES partidos(id) ON DELETE CASCADE;
alter table public."result_change_logs" add constraint "result_change_logs_pkey" PRIMARY KEY (id);
alter table public."team_audit_closure_events" add constraint "team_audit_closure_events_estado_check" CHECK ((estado = ANY (ARRAY['CERRADO_CONFORME'::text, 'CERRADO_CON_OBSERVACIONES'::text, 'REABIERTO'::text])));
alter table public."team_audit_closure_events" add constraint "team_audit_closure_events_observation_check" CHECK (((estado = 'CERRADO_CONFORME'::text) OR (NULLIF(btrim(COALESCE(observacion, ''::text)), ''::text) IS NOT NULL)));
alter table public."team_audit_closure_events" add constraint "team_audit_closure_events_pkey" PRIMARY KEY (id);
alter table public."team_audit_closure_events" add constraint "team_audit_closure_events_snapshot_check" CHECK ((jsonb_typeof(resumen_snapshot) = 'object'::text));
alter table public."team_documents" add constraint "team_documents_categoria_id_fkey" FOREIGN KEY (categoria_id) REFERENCES categorias(id);
alter table public."team_documents" add constraint "team_documents_equipo_id_fkey" FOREIGN KEY (equipo_id) REFERENCES equipos(id);
alter table public."team_documents" add constraint "team_documents_organizacion_id_fkey" FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id);
alter table public."team_documents" add constraint "team_documents_pkey" PRIMARY KEY (id);
alter table public."team_documents" add constraint "team_documents_requirement_id_fkey" FOREIGN KEY (requirement_id) REFERENCES document_requirements(id);
alter table public."team_documents" add constraint "team_documents_status_check" CHECK ((status = ANY (ARRAY['pendiente'::text, 'cargado'::text, 'observado'::text, 'aprobado'::text, 'rechazado'::text, 'vencido'::text])));
alter table public."team_documents" add constraint "team_documents_torneo_id_fkey" FOREIGN KEY (torneo_id) REFERENCES torneos(id);
alter table public."team_players" add constraint "team_players_categoria_id_fkey" FOREIGN KEY (categoria_id) REFERENCES categorias(id);
alter table public."team_players" add constraint "team_players_equipo_id_fkey" FOREIGN KEY (equipo_id) REFERENCES equipos(id);
alter table public."team_players" add constraint "team_players_organizacion_id_fkey" FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id);
alter table public."team_players" add constraint "team_players_pkey" PRIMARY KEY (id);
alter table public."team_players" add constraint "team_players_torneo_id_fkey" FOREIGN KEY (torneo_id) REFERENCES torneos(id);
alter table public."torneos" add constraint "torneos_organizacion_id_fkey" FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id) ON DELETE CASCADE;
alter table public."torneos" add constraint "torneos_pkey" PRIMARY KEY (id);
create UNIQUE INDEX app_usage_events_pkey ON public.app_usage_events USING btree (id);
create INDEX idx_app_usage_events_categoria ON public.app_usage_events USING btree (categoria_nombre);
create INDEX idx_app_usage_events_created_at ON public.app_usage_events USING btree (created_at DESC);
create INDEX idx_app_usage_events_event_type ON public.app_usage_events USING btree (event_type);
create UNIQUE INDEX app_user_permissions_pkey ON public.app_user_permissions USING btree (id);
create INDEX idx_app_user_permissions_scope ON public.app_user_permissions USING btree (organizacion_id, torneo_id, categoria_id, equipo_id);
create INDEX idx_app_user_permissions_user ON public.app_user_permissions USING btree (user_id);
create UNIQUE INDEX app_users_auth_user_id_key ON public.app_users USING btree (auth_user_id);
create UNIQUE INDEX app_users_legacy_key_key ON public.app_users USING btree (legacy_key);
create UNIQUE INDEX app_users_pkey ON public.app_users USING btree (id);
create INDEX idx_app_users_legacy_key ON public.app_users USING btree (legacy_key);
create INDEX idx_app_users_role ON public.app_users USING btree (role);
create UNIQUE INDEX auditoria_resultados_pkey ON public.auditoria_resultados USING btree (id);
create INDEX idx_auditoria_resultados_partido_id ON public.auditoria_resultados USING btree (partido_id);
create UNIQUE INDEX categorias_pkey ON public.categorias USING btree (id);
create INDEX idx_categorias_torneo_id ON public.categorias USING btree (torneo_id);
create UNIQUE INDEX delegado_categorias_delegado_id_categoria_id_key ON public.delegado_categorias USING btree (delegado_id, categoria_id);
create UNIQUE INDEX delegado_categorias_pkey ON public.delegado_categorias USING btree (id);
create INDEX idx_delegado_categorias_categoria_id ON public.delegado_categorias USING btree (categoria_id);
create INDEX idx_delegado_categorias_delegado_id ON public.delegado_categorias USING btree (delegado_id);
create UNIQUE INDEX delegados_auth_user_id_key ON public.delegados USING btree (auth_user_id);
create UNIQUE INDEX delegados_email_key ON public.delegados USING btree (email);
create UNIQUE INDEX delegados_pkey ON public.delegados USING btree (id);
create UNIQUE INDEX document_ai_audits_pkey ON public.document_ai_audits USING btree (id);
create INDEX idx_document_ai_audits_audited_at ON public.document_ai_audits USING btree (audited_at DESC);
create INDEX idx_document_ai_audits_categoria_equipo ON public.document_ai_audits USING btree (categoria_id, equipo_id);
create INDEX idx_document_ai_audits_criteria_version ON public.document_ai_audits USING btree (criteria_version);
create INDEX idx_document_ai_audits_player_document ON public.document_ai_audits USING btree (player_document_id);
create INDEX idx_document_ai_audits_source ON public.document_ai_audits USING btree (source_kind, source_file_id);
create INDEX idx_document_ai_audits_status ON public.document_ai_audits USING btree (audit_status);
create INDEX idx_document_ai_audits_team_document ON public.document_ai_audits USING btree (team_document_id);
create UNIQUE INDEX document_audit_criteria_versions_pkey ON public.document_audit_criteria_versions USING btree (version);
create UNIQUE INDEX document_audit_results_pkey ON public.document_audit_results USING btree (id);
create INDEX idx_document_audit_results_categoria ON public.document_audit_results USING btree (categoria_id);
create INDEX idx_document_audit_results_equipo ON public.document_audit_results USING btree (equipo_nombre);
create INDEX idx_document_audit_results_player ON public.document_audit_results USING btree (player_id);
create INDEX idx_document_audit_results_risk ON public.document_audit_results USING btree (risk_level);
create INDEX idx_document_audit_results_status ON public.document_audit_results USING btree (audit_status);
create UNIQUE INDEX document_events_pkey ON public.document_events USING btree (id);
create INDEX idx_document_events_document ON public.document_events USING btree (team_document_id);
create UNIQUE INDEX document_files_pkey ON public.document_files USING btree (id);
create INDEX idx_document_files_document ON public.document_files USING btree (team_document_id);
create UNIQUE INDEX document_requirements_pkey ON public.document_requirements USING btree (id);
create INDEX idx_document_requirements_categoria ON public.document_requirements USING btree (categoria_id);
create INDEX idx_document_requirements_torneo ON public.document_requirements USING btree (torneo_id);
create UNIQUE INDEX drive_player_documents_file_unique ON public.drive_player_documents USING btree (drive_file_id, document_type);
create UNIQUE INDEX drive_player_documents_pkey ON public.drive_player_documents USING btree (id);
create INDEX idx_drive_player_documents_categoria ON public.drive_player_documents USING btree (categoria_id);
create INDEX idx_drive_player_documents_match_status ON public.drive_player_documents USING btree (match_status);
create INDEX idx_drive_player_documents_player ON public.drive_player_documents USING btree (player_id);
create INDEX idx_drive_player_documents_status ON public.drive_player_documents USING btree (status);
create UNIQUE INDEX equipos_pkey ON public.equipos USING btree (id);
create INDEX idx_equipos_categoria_id ON public.equipos USING btree (categoria_id);
create UNIQUE INDEX fechas_pkey ON public.fechas USING btree (id);
create INDEX idx_fechas_categoria_id ON public.fechas USING btree (categoria_id);
create UNIQUE INDEX fixtures_publicos_pkey ON public.fixtures_publicos USING btree (id);
create UNIQUE INDEX idx_fixtures_publicos_categoria ON public.fixtures_publicos USING btree (categoria);
create INDEX match_schedules_categoria_idx ON public.match_schedules USING btree (categoria_id, fecha_partido, hora);
create UNIQUE INDEX match_schedules_partido_unique ON public.match_schedules USING btree (partido_id);
create UNIQUE INDEX match_schedules_pkey ON public.match_schedules USING btree (id);
create UNIQUE INDEX organizaciones_pkey ON public.organizaciones USING btree (id);
create UNIQUE INDEX organizaciones_slug_key ON public.organizaciones USING btree (slug);
create INDEX idx_partidos_categoria_id ON public.partidos USING btree (categoria_id);
create INDEX idx_partidos_fecha_id ON public.partidos USING btree (fecha_id);
create UNIQUE INDEX partidos_pkey ON public.partidos USING btree (id);
create UNIQUE INDEX player_document_events_pkey ON public.player_document_events USING btree (id);
create INDEX idx_player_documents_categoria_equipo ON public.player_documents USING btree (categoria_id, equipo_id);
create INDEX idx_player_documents_player ON public.player_documents USING btree (player_id);
create INDEX idx_player_documents_status ON public.player_documents USING btree (status);
create UNIQUE INDEX player_documents_pkey ON public.player_documents USING btree (id);
create UNIQUE INDEX player_documents_unique_requirement ON public.player_documents USING btree (player_id, requirement_id);
create INDEX playoff_matches_categoria_idx ON public.playoff_matches USING btree (categoria_id, orden, partido_numero);
create UNIQUE INDEX playoff_matches_pkey ON public.playoff_matches USING btree (id);
create UNIQUE INDEX playoff_matches_unique_match ON public.playoff_matches USING btree (categoria_id, fase, llave, partido_numero);
create INDEX idx_result_change_logs_categoria ON public.result_change_logs USING btree (categoria_id, created_at DESC);
create INDEX idx_result_change_logs_partido ON public.result_change_logs USING btree (partido_id, created_at DESC);
create INDEX idx_result_change_logs_torneo ON public.result_change_logs USING btree (torneo_id, created_at DESC);
create UNIQUE INDEX result_change_logs_pkey ON public.result_change_logs USING btree (id);
create INDEX idx_team_audit_closure_events_scope ON public.team_audit_closure_events USING btree (torneo_id, categoria_id, equipo_id, created_at DESC, id DESC);
create UNIQUE INDEX team_audit_closure_events_pkey ON public.team_audit_closure_events USING btree (id);
create INDEX idx_team_documents_categoria_equipo ON public.team_documents USING btree (categoria_id, equipo_id);
create INDEX idx_team_documents_status ON public.team_documents USING btree (status);
create INDEX idx_team_documents_torneo ON public.team_documents USING btree (torneo_id);
create UNIQUE INDEX team_documents_pkey ON public.team_documents USING btree (id);
create INDEX idx_team_players_categoria_equipo ON public.team_players USING btree (categoria_id, equipo_id);
create UNIQUE INDEX team_players_pkey ON public.team_players USING btree (id);
create INDEX idx_torneos_organizacion_id ON public.torneos USING btree (organizacion_id);
create UNIQUE INDEX torneos_pkey ON public.torneos USING btree (id);
alter table public."app_usage_events" enable row level security;
alter table public."app_user_permissions" enable row level security;
alter table public."app_users" enable row level security;
alter table public."auditoria_resultados" enable row level security;
alter table public."categorias" enable row level security;
grant select on public."categorias" to anon, authenticated;
create policy "categorias_isolated_public_read" on public."categorias" for select to anon, authenticated using (true);
alter table public."delegado_categorias" enable row level security;
alter table public."delegados" enable row level security;
alter table public."document_ai_audits" enable row level security;
alter table public."document_audit_criteria_versions" enable row level security;
alter table public."document_audit_results" enable row level security;
alter table public."document_events" enable row level security;
alter table public."document_files" enable row level security;
alter table public."document_requirements" enable row level security;
alter table public."drive_player_documents" enable row level security;
alter table public."equipos" enable row level security;
grant select on public."equipos" to anon, authenticated;
create policy "equipos_isolated_public_read" on public."equipos" for select to anon, authenticated using (true);
alter table public."fechas" enable row level security;
grant select on public."fechas" to anon, authenticated;
create policy "fechas_isolated_public_read" on public."fechas" for select to anon, authenticated using (true);
alter table public."fixtures_publicos" enable row level security;
grant select on public."fixtures_publicos" to anon, authenticated;
create policy "fixtures_publicos_isolated_public_read" on public."fixtures_publicos" for select to anon, authenticated using (true);
alter table public."match_schedules" enable row level security;
grant select on public."match_schedules" to anon, authenticated;
create policy "match_schedules_isolated_public_read" on public."match_schedules" for select to anon, authenticated using (true);
alter table public."organizaciones" enable row level security;
grant select on public."organizaciones" to anon, authenticated;
create policy "organizaciones_isolated_public_read" on public."organizaciones" for select to anon, authenticated using (true);
alter table public."partidos" enable row level security;
grant select on public."partidos" to anon, authenticated;
create policy "partidos_isolated_public_read" on public."partidos" for select to anon, authenticated using (true);
alter table public."player_document_events" enable row level security;
alter table public."player_documents" enable row level security;
alter table public."playoff_matches" enable row level security;
grant select on public."playoff_matches" to anon, authenticated;
create policy "playoff_matches_isolated_public_read" on public."playoff_matches" for select to anon, authenticated using (true);
alter table public."result_change_logs" enable row level security;
alter table public."team_audit_closure_events" enable row level security;
alter table public."team_documents" enable row level security;
alter table public."team_players" enable row level security;
alter table public."torneos" enable row level security;
grant select on public."torneos" to anon, authenticated;
create policy "torneos_isolated_public_read" on public."torneos" for select to anon, authenticated using (true);
-- View definition recovered from metadata; private views are denied to anon below.
create or replace view public."v_app_user_permissions" as select au.id AS user_id,
    au.display_name,
    au.email,
    au.role,
    au.legacy_key,
    au.active,
    au.emergency_access,
    aup.id AS permission_id,
    aup.organizacion_id,
    o.nombre AS organizacion_nombre,
    aup.torneo_id,
    t.nombre AS torneo_nombre,
    aup.categoria_id,
    c.nombre AS categoria_nombre,
    aup.equipo_id,
    COALESCE(e.nombre, aup.equipo_nombre) AS equipo_nombre,
    aup.can_view,
    aup.can_load_results,
    aup.can_load_documents,
    aup.can_review_documents,
    aup.can_correct_results,
    aup.can_manage_tournaments,
    aup.can_manage_users,
    aup.can_emergency_override
   FROM app_users au
     LEFT JOIN app_user_permissions aup ON aup.user_id = au.id
     LEFT JOIN organizaciones o ON o.id = aup.organizacion_id
     LEFT JOIN torneos t ON t.id = aup.torneo_id
     LEFT JOIN categorias c ON c.id = aup.categoria_id
     LEFT JOIN equipos e ON e.id = aup.equipo_id;;
revoke all on public."v_app_user_permissions" from anon;
-- View definition recovered from metadata; private views are denied to anon below.
create or replace view public."v_document_ai_audits_latest" as select DISTINCT ON ((COALESCE(team_document_id, player_document_id)), scope) id,
    scope,
    team_document_id,
    player_document_id,
    organizacion_id,
    torneo_id,
    categoria_id,
    equipo_id,
    equipo_nombre,
    player_id,
    player_name,
    requirement_id,
    requirement_nombre,
    storage_path,
    file_name,
    file_type,
    audit_status,
    confidence,
    summary,
    findings,
    extracted_text,
    detected_dates,
    valid_until,
    checks,
    criteria_version,
    unresolved_reason,
    page_evidence,
    source_kind,
    source_file_id,
    source_file_url,
    source_modified_at,
    source_hash,
    model,
    audited_by,
    audited_at,
    created_at,
    updated_at
   FROM document_ai_audits
  ORDER BY (COALESCE(team_document_id, player_document_id)), scope, audited_at DESC;;
-- View definition recovered from metadata; private views are denied to anon below.
create or replace view public."v_document_audit_results_admin" as select dar.id,
    dar.organizacion_id,
    dar.torneo_id,
    dar.categoria_id,
    COALESCE(c.nombre, dar.categoria_nombre) AS categoria_nombre,
    dar.equipo_nombre,
    dar.player_id,
    COALESCE(tp.nombre, dar.player_name) AS player_name,
    dar.alcance,
    dar.planilla_arbitro,
    dar.document_type,
    dar.declared_status,
    dar.located_status,
    dar.validated_status,
    dar.valid_until,
    dar.audit_status,
    dar.risk_level,
        CASE
            WHEN lower(COALESCE(dar.risk_level, dar.audit_status, ''::text)) ~~ '%critica%'::text OR lower(COALESCE(dar.risk_level, dar.audit_status, ''::text)) ~~ '%crítica%'::text THEN 1
            WHEN lower(COALESCE(dar.risk_level, dar.audit_status, ''::text)) ~~ '%alta%'::text THEN 2
            WHEN lower(COALESCE(dar.risk_level, dar.audit_status, ''::text)) ~~ '%media%'::text THEN 3
            WHEN lower(COALESCE(dar.risk_level, dar.audit_status, ''::text)) ~~ '%validado%'::text OR lower(COALESCE(dar.risk_level, dar.audit_status, ''::text)) ~~ '%conforme%'::text THEN 9
            ELSE 5
        END AS risk_order,
    dar.observation,
    dar.evidence_url,
    dar.source_sheet,
    dar.cutoff_date,
    dar.imported_by,
    dar.imported_at,
    dar.created_at,
    dar.updated_at
   FROM document_audit_results dar
     LEFT JOIN categorias c ON c.id = dar.categoria_id
     LEFT JOIN team_players tp ON tp.id = dar.player_id;;
revoke all on public."v_document_audit_results_admin" from anon;
-- View definition recovered from metadata; private views are denied to anon below.
create or replace view public."v_drive_player_documents_admin" as select dpd.id,
    dpd.organizacion_id,
    o.nombre AS organizacion_nombre,
    dpd.torneo_id,
    t.nombre AS torneo_nombre,
    dpd.categoria_id,
    c.nombre AS categoria_nombre,
    dpd.equipo_id,
    dpd.equipo_nombre,
    dpd.player_id,
    COALESCE(tp.nombre, dpd.player_name) AS player_name,
    tp.dni AS player_dni,
    tp.dorsal AS player_dorsal,
    dpd.document_type,
    dpd.title,
    dpd.drive_file_id,
    dpd.drive_url,
    dpd.mime_type,
    dpd.status,
    dpd.observation,
    dpd.match_status,
    dpd.source_folder,
    dpd.reviewed_by,
    dpd.reviewed_at,
    dpd.created_at,
    dpd.updated_at
   FROM drive_player_documents dpd
     LEFT JOIN team_players tp ON tp.id = dpd.player_id
     LEFT JOIN organizaciones o ON o.id = dpd.organizacion_id
     LEFT JOIN torneos t ON t.id = dpd.torneo_id
     LEFT JOIN categorias c ON c.id = dpd.categoria_id;;
revoke all on public."v_drive_player_documents_admin" from anon;
-- View definition recovered from metadata; private views are denied to anon below.
create or replace view public."v_player_documents_admin" as select pd.id,
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
    o.nombre AS organizacion_nombre,
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
   FROM player_documents pd
     JOIN team_players tp ON tp.id = pd.player_id
     LEFT JOIN document_requirements dr ON dr.id = pd.requirement_id
     LEFT JOIN organizaciones o ON o.id = pd.organizacion_id
     LEFT JOIN torneos t ON t.id = pd.torneo_id
     LEFT JOIN categorias c ON c.id = pd.categoria_id
  WHERE tp.activo = true;;
revoke all on public."v_player_documents_admin" from anon;
-- View definition recovered from metadata; private views are denied to anon below.
create or replace view public."v_player_documents_admin_ai" as select pd.id,
    pd.player_id,
    pd.jugador_nombre,
    pd.jugador_dni,
    pd.jugador_dorsal,
    pd.baja_solicitada,
    pd.baja_motivo,
    pd.baja_solicitada_por,
    pd.baja_solicitada_en,
    pd.requirement_id,
    pd.requirement_nombre,
    pd.organizacion_id,
    pd.organizacion_nombre,
    pd.torneo_id,
    pd.torneo_nombre,
    pd.categoria_id,
    pd.categoria_nombre,
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
    pd.updated_at,
    ai.audit_status AS ai_audit_status,
    ai.confidence AS ai_confidence,
    ai.summary AS ai_summary,
    ai.findings AS ai_findings,
    ai.detected_dates AS ai_detected_dates,
    ai.valid_until AS ai_valid_until,
    ai.checks AS ai_checks,
    ai.criteria_version AS ai_criteria_version,
    ai.unresolved_reason AS ai_unresolved_reason,
    ai.page_evidence AS ai_page_evidence,
    ai.source_kind AS ai_source_kind,
    ai.source_file_id AS ai_source_file_id,
    ai.audited_at AS ai_audited_at
   FROM v_player_documents_admin pd
     LEFT JOIN v_document_ai_audits_latest ai ON ai.scope = 'player'::text AND ai.player_document_id = pd.id;;
revoke all on public."v_player_documents_admin_ai" from anon;
-- View definition recovered from metadata; private views are denied to anon below.
create or replace view public."v_result_change_logs_admin" as select rcl.id,
    rcl.created_at,
    rcl.partido_id,
    rcl.torneo_id,
    t.nombre AS torneo_nombre,
    t.temporada,
    rcl.categoria_id,
    rcl.categoria_nombre,
    rcl.fase,
    rcl.jornada,
    rcl.fecha,
    rcl.local,
    rcl.visitante,
    rcl.puntos_local_anterior,
    rcl.puntos_visitante_anterior,
    rcl.estado_resultado_anterior,
    rcl.cargado_por_anterior,
    rcl.cargado_en_anterior,
    rcl.puntos_local_nuevo,
    rcl.puntos_visitante_nuevo,
    rcl.estado_resultado_nuevo,
    rcl.cargado_por_nuevo,
    rcl.cargado_en_nuevo,
    rcl.accion,
    rcl.actor,
    rcl.origen,
    rcl.detalle
   FROM result_change_logs rcl
     LEFT JOIN torneos t ON t.id = rcl.torneo_id
  ORDER BY rcl.created_at DESC;;
revoke all on public."v_result_change_logs_admin" from anon;
-- View definition recovered from metadata; private views are denied to anon below.
create or replace view public."v_team_documents_admin" as select td.id,
    td.requirement_id,
    dr.nombre AS requirement_nombre,
    td.organizacion_id,
    o.nombre AS organizacion_nombre,
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
   FROM team_documents td
     LEFT JOIN document_requirements dr ON dr.id = td.requirement_id
     LEFT JOIN organizaciones o ON o.id = td.organizacion_id
     LEFT JOIN torneos t ON t.id = td.torneo_id
     LEFT JOIN categorias c ON c.id = td.categoria_id;;
revoke all on public."v_team_documents_admin" from anon;
-- View definition recovered from metadata; private views are denied to anon below.
create or replace view public."v_team_documents_admin_ai" as select td.id,
    td.requirement_id,
    td.requirement_nombre,
    td.organizacion_id,
    td.organizacion_nombre,
    td.torneo_id,
    td.torneo_nombre,
    td.categoria_id,
    td.categoria_nombre,
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
    td.updated_at,
    ai.audit_status AS ai_audit_status,
    ai.confidence AS ai_confidence,
    ai.summary AS ai_summary,
    ai.findings AS ai_findings,
    ai.detected_dates AS ai_detected_dates,
    ai.valid_until AS ai_valid_until,
    ai.checks AS ai_checks,
    ai.criteria_version AS ai_criteria_version,
    ai.unresolved_reason AS ai_unresolved_reason,
    ai.page_evidence AS ai_page_evidence,
    ai.source_kind AS ai_source_kind,
    ai.source_file_id AS ai_source_file_id,
    ai.audited_at AS ai_audited_at
   FROM v_team_documents_admin td
     LEFT JOIN v_document_ai_audits_latest ai ON ai.scope = 'team'::text AND ai.team_document_id = td.id;;
revoke all on public."v_team_documents_admin_ai" from anon;
commit;
