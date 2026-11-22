const assert = require("node:assert/strict");
const fs = require("node:fs");
const adapter = require("../apdb-administrative-adapter.js");
const sql = fs.readFileSync("supabase/migrations/20261122000000_apdb_administrative_onboarding_rpc.sql", "utf8");

assert.deepEqual(Object.keys(adapter).sort(), ["ensureTournamentCategoryTeams", "revokeDelegateScope", "setDelegateScope"].sort());
assert.match(sql, /auth\.uid\(\)/);
assert.match(sql, /set search_path = public, auth, pg_temp/);
assert.match(sql, /can_manage_tournaments/);
assert.match(sql, /can_manage_users/);
assert.match(sql, /organizacion_id = v_actor\.organizacion_id/);
assert.match(sql, /revoke all on function public\.apdb_ensure_tournament_category_teams/);
assert.match(sql, /grant execute on function public\.apdb_ensure_tournament_category_teams.*authenticated/s);
assert.doesNotMatch(fs.readFileSync("apdb-administrative-adapter.js", "utf8"), /\.from\(/);
console.log("APDB_ADMINISTRATIVE_ADAPTER_CONTRACT_OK");
