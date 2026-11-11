"use strict";

const fs = require("node:fs");
const assert = require("node:assert/strict");
const file = process.argv[2] || "tools/apdb-staging-config.example.json";
const config = JSON.parse(fs.readFileSync(file, "utf8"));
assert.equal(config.environment, "staging", "staging configuration required");
assert.equal(config.resetDatabaseOnStart, false, "persistent staging must not reset on start");
assert.match(config.supabaseUrl, /^https:\/\/[^/]+\.supabase\.co\/?$/, "expected independent hosted staging URL");
assert.doesNotMatch(config.supabaseUrl, /eshbydpsmypflfxpmhyk|localhost|127\.0\.0\.1/i, "production or local URL used as staging");
assert.match(config.supabaseAnonKey, /^YOUR_STAGING_|^sb_publishable_/i, "only a publishable/anon key is allowed");
assert.doesNotMatch(config.supabaseAnonKey, /service_role|secret|sb_secret|eyJ/i, "privileged credential is forbidden");
assert.match(config.publicBasePath, /^\/[A-Za-z0-9._/-]+\/$/, "staging must have an isolated base path");
console.log(`APDB_STAGING_CONFIG_OK base=${config.publicBasePath}`);
