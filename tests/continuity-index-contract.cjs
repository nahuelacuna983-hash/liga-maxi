const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "docs", "CENTRO_CONTINUIDAD.md"), "utf8");
for (const file of [
  "docs/control-proyecto.md", "docs/APDB_2027_PERSISTENCIA_CONTINUIDAD.md",
  "docs/APDB_2027_STAGING_RUNBOOK.md", "docs/APDB_2027_DEMOSTRACION_INSTITUCIONAL.md",
  "docs/paquete-cpanel.md", "docs/prueba-controlada-dominio-cpanel.md",
  "tools/start-apdb-isolated-pilot.ps1", "supabase/config.toml", "supabase/seed.sql"
]) {
  assert.ok(fs.existsSync(path.join(root, file)), `missing continuity reference: ${file}`);
}
assert.match(index, /No hay dump en el repositorio/);
assert.match(index, /Sin copia restaurable comprobada/);
assert.doesNotMatch(index, /service_role\s*[:=]\s*\S+/i);
console.log("APDB_CONTINUITY_INDEX_OK");
