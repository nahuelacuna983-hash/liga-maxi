"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("app_online.js", "utf8");
assert.match(source, /window\.APDB_SUPABASE_URL/);
assert.match(source, /window\.APDB_SUPABASE_ANON_KEY/);
assert.match(source, /secureResults/);
console.log("APDB_ONLINE_ISOLATED_CONFIG_CONTRACT_OK");
