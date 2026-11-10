"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync(require.resolve("./apdb-2027-rls-gate.cjs"), "utf8");
assert.match(source, /throw new Error\(`Faltan tablas críticas/);
assert.match(source, /throw new Error\(`Faltan vistas administrativas requeridas/);
assert.match(source, /Sin políticas RLS declaradas/);
assert.doesNotMatch(source, /Política de escritura anon presente/);
assert.match(source, /SECURITY DEFINER con search_path mutable/);
console.log("APDB_RLS_GATE_NEGATIVE_CONTRACT_OK");
