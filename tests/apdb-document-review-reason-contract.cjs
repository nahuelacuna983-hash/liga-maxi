const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("app_online.js", "utf8");
const start = source.indexOf("async function revisarDocumentoAsociacion(event) {");
const end = source.indexOf("\nasync function ", start + 1);
assert.ok(start >= 0, "Falta el controlador de revisión documental");
const handler = source.slice(start, end < 0 ? undefined : end);

assert.match(handler, /nextStatus === "observado" \|\| nextStatus === "rechazado"/);
assert.match(handler, /if \(respuesta === null\)\s*\{[\s\S]*?return;/);
assert.match(handler, /observacion = respuesta\.trim\(\)/);
assert.match(handler, /if \(!observacion\)\s*\{[\s\S]*?return;/);
assert.match(handler, /if \(!observacion\)[\s\S]*?return;[\s\S]*?supabaseClient\.rpc\(/);
assert.match(handler, /p_observacion: observacion \|\| null/);

console.log("APDB_DOCUMENT_REVIEW_REASON_CONTRACT_OK");
