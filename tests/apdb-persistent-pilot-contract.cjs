"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const launcher = fs.readFileSync("tools/start-apdb-persistent-pilot.ps1", "utf8");
const seed = fs.readFileSync("supabase/seed.sql", "utf8");
const server = fs.readFileSync("tools/apdb-isolated-server.cjs", "utf8");
const config = fs.readFileSync("supabase/config.toml", "utf8");

assert.match(config, /project_id\s*=\s*"apdb-2027-isolated"/);
assert.match(launcher, /project_id\\s\*=\\s\*"apdb-2027-isolated"/);
assert.match(launcher, /supabase db push --local --include-seed/);
assert.match(launcher, /SUPABASE_URL -notmatch '\^https\?\:\/\/127\\\.0\\\.0\\\.1/);
assert.doesNotMatch(launcher, /^\s*supabase\s+db\s+reset\b|--linked|--remote/im);
assert.match(server, /127\.0\.0\.1/);
assert.equal((seed.match(/on conflict \(id\) do nothing/gi) || []).length, 5);

console.log("APDB_PERSISTENT_PILOT_CONTRACT_OK");
