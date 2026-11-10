"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync(require.resolve("./apdb-2027-rls-gate.cjs"), "utf8");
assert.match(source, /endsWith\("supabase\.co"\)/);
assert.match(source, /APDB_ALLOW_NONLOCAL_ISOLATED/);
assert.match(source, /APDB_ALLOWED_DATABASE/);
assert.match(source, /current_database\(\)/);
assert.match(source, /BEGIN TRANSACTION READ ONLY/);
assert.match(source, /ROLLBACK/);
console.log("APDB_RLS_GATE_CONTRACT_OK");
