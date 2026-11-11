"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const seed = JSON.parse(fs.readFileSync("tests/fixtures/apdb-2027-auth-seed.json", "utf8"));

const readme = fs.readFileSync("supabase/migrations/README.md", "utf8");
const order = fs.readFileSync("docs/APDB_2027_MIGRACIONES_AISLADAS.md", "utf8");
assert.match(readme, /sin migraciones ejecutables/i);
assert.match(order, /auth\.users/);
assert.match(order, /storage\.objects/);
assert.match(order, /delegados/);
assert.doesNotMatch(order, /APROBADO|LISTO PARA PRODUCCION/i);
assert.equal(seed.organizations.length, 2);
assert.equal(seed.users.filter((user) => user.role === "delegate").length, 3);
assert.equal(seed.users.find((user) => user.key === "delegate-revoked").revoked, true);
assert.match(seed.authUserCreation, /isolated Supabase Auth/);
console.log("APDB_MIGRATION_READINESS_OK");
