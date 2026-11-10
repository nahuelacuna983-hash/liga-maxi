"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");

const required = [
  "docs/ejecutar-en-supabase-permisos-base.sql",
  "docs/ejecutar-en-supabase-documentacion-subidas.sql",
  "docs/ejecutar-en-supabase-documentacion-jugadores.sql",
  "docs/ejecutar-en-supabase-playoffs.sql",
  "docs/ejecutar-en-supabase-programacion.sql",
  "tests/apdb-rls-negative.sql",
];
for (const file of required) assert.ok(fs.existsSync(file), `Falta dependencia: ${file}`);

const names = ["supabase", "docker", "psql"];
const available = names.filter((name) => {
  const probe = process.platform === "win32"
    ? spawnSync("where", [name], { encoding: "utf8", windowsHide: true })
    : spawnSync("sh", ["-lc", `command -v ${name}`], { encoding: "utf8" });
  return probe.status === 0 && Boolean((probe.stdout || "").trim());
});
console.log(JSON.stringify({
  isolatedOnly: true,
  requiredFiles: required.length,
  localToolsDetected: available,
  authStorageValidation: "requires isolated Supabase Auth/Storage; not inferred from PostgreSQL fixture",
}, null, 2));
console.log("APDB_SUPABASE_PREFLIGHT_OK");
