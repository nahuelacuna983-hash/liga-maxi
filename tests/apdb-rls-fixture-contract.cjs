"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const sql = fs.readFileSync(require.resolve("../docs/apdb-2027-rls-fixture.sql"), "utf8");
for (const table of ["categorias", "partidos", "playoff_matches", "match_schedules", "player_documents", "team_documents", "app_users"]) {
  assert.match(sql, new RegExp(`create table ${table}\\b`, "i"));
  assert.match(sql, /alter table public\.%I enable row level security/i);
}
for (const view of ["v_team_documents_admin", "v_player_documents_admin", "v_app_user_permissions"]) {
  assert.match(sql, new RegExp(`create view ${view}\\b`, "i"));
  assert.match(sql, new RegExp(`revoke all on[\\s\\S]*${view}`, "i"));
}
assert.match(sql, /security definer set search_path = public/i);
assert.match(sql, /revoke execute on function[\s\S]*from anon/i);
assert.match(sql, /APDB_RLS_FIXTURE_READY/);
console.log("APDB_RLS_FIXTURE_CONTRACT_OK");
