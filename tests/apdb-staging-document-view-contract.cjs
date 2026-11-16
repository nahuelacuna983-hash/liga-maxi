"use strict";

const fs = require("node:fs");

const migration = fs.readFileSync(
  "supabase/migrations/20261116000000_apdb_document_access_fix.sql",
  "utf8"
);

for (const fragment of [
  "security definer",
  "set search_path = public, auth",
  "au.role in ('asociacion', 'admin_general')",
  "and au.role = 'delegado'",
  "aup.equipo_id = p_equipo_id",
  "aup.can_load_documents",
  "where c.id = p_categoria_id",
  "where e.id = p_equipo_id",
  "with (security_barrier = true)",
  "owner to postgres",
  "revoke all on public.v_team_documents_admin from public, anon, authenticated",
  "grant select on public.v_team_documents_admin to authenticated"
]) {
  if (!migration.includes(fragment)) {
    throw new Error(`Falta protección documental requerida: ${fragment}`);
  }
}

if (/grant\s+select\s+on\s+public\.v_team_documents_admin\s+to\s+anon/i.test(migration)) {
  throw new Error("La vista documental no puede otorgarse a anon");
}

console.log("APDB_STAGING_DOCUMENT_VIEW_CONTRACT_OK");
