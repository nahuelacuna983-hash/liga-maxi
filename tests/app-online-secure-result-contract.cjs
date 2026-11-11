"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("app_online.js", "utf8");
assert.match(source, /function usaRpcResultadosSeguros\(\)/);
assert.match(source, /supabaseClient\.rpc\("apdb_save_result"/);
assert.match(source, /p_match_id: partidoId/);
assert.match(source, /p_home_score: pl/);
assert.match(source, /p_away_score: pv/);
console.log("APDB_APP_ONLINE_SECURE_RESULT_CONTRACT_OK");
