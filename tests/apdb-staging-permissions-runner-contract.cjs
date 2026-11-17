"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("tests/apdb-staging-permissions.cjs", "utf8");

for (const fragment of [
  "assertAuthorizedScheduleChange",
  "scheduleAfterAuthorized",
  '["updated_at", "informado_por", "informado_en"]',
  "PROGRAMACION_AUTORIZADA_PERSISTIDA",
  "/rest/v1/v_team_documents_admin?categoria_id=eq.${CATEGORY_ID}&equipo_id=eq.${NORTH_TEAM_ID}",
  "/rest/v1/v_team_documents_admin?categoria_id=eq.${CATEGORY_ID}&equipo_id=eq.${SOUTH_TEAM_ID}",
  "anon pudo leer la vista documental protegida",
  "No se configuró APDB_NO_PERMISSION_EMAIL",
  "canonical(scheduleAfterAuthorized)"
]) {
  assert.ok(source.includes(fragment), `Falta garantía del ejecutor: ${fragment}`);
}

assert.ok(
  !/request\(config\.url,\s*["'`]\/rest\/v1\/team_documents\?[^\n]+select=/m.test(source),
  "El ejecutor no debe leer team_documents directamente"
);

console.log("APDB_STAGING_PERMISSIONS_RUNNER_CONTRACT_OK");
