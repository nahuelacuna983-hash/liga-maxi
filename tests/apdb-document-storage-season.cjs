"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync(require.resolve("../app_online.js"), "utf8");
assert.match(source, /function temporadaDocumentalActiva\(\)/);
assert.match(source, /const temporada = temporadaDocumentalActiva\(\);/);
assert.match(source, /Seleccioná un torneo con temporada antes de subir documentación/);

const uploadBlocks = source.match(/storagePath = \[[\s\S]*?\.join\("\/"\);/g) || [];
assert.ok(uploadBlocks.length >= 2, "Se esperan las rutas de equipo y jugador");
for (const block of uploadBlocks) {
  assert.match(block, /temporada/);
  assert.doesNotMatch(block, /["']2026["']/);
}

console.log("APDB_DOCUMENT_STORAGE_SEASON_OK");
