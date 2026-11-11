"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");

const sources = [
  "docs/ejecutar-en-supabase-permisos-base.sql",
  "docs/ejecutar-en-supabase-permisos-seed-apdb.sql",
  "docs/ejecutar-en-supabase-documentacion.sql",
  "docs/ejecutar-en-supabase-documentacion-jugadores.sql",
  "docs/ejecutar-en-supabase-documentacion-subidas.sql",
  "docs/ejecutar-en-supabase-playoffs.sql",
  "docs/ejecutar-en-supabase-programacion.sql",
];
for (const file of sources) {
  const sql = fs.readFileSync(file, "utf8");
  assert.ok(sql.length > 100, `${file}: fuente vacía o incompleta`);
  assert.doesNotMatch(sql, /supabase\.co|service_role|sb_secret|eyJ[A-Za-z0-9_-]{20,}/i,
    `${file}: contiene referencia o secreto productivo`);
}
console.log(`APDB_SUPABASE_SOURCE_MANIFEST_OK sources=${sources.length}`);
