"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");

const app = fs.readFileSync("app_online.js", "utf8");
const contract = fs.readFileSync("docs/APDB_2027_CONTRATO_COMPATIBILIDAD_RLS.md", "utf8");

for (const table of ["partidos", "categorias", "playoff_matches", "match_schedules"]) {
  assert.match(app, new RegExp(`from\\(\\\"${table}\\\"\\)`), `${table}: operación no localizada`);
}
assert.match(app, /rpc\("add_team_player"/, "add_team_player: RPC no localizada");
assert.match(app, /review_player_document/);
assert.match(app, /review_team_document/);
assert.match(contract, /Delegado autorizado/);
assert.match(contract, /Delegado ajeno\/revocado/);
assert.match(contract, /Storage: bucket privado/);
console.log("APDB_AUTHORIZATION_CONTRACT_OK");
