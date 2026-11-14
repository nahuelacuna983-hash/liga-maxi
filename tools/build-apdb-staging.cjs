"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const configPath = path.resolve(process.argv[2] || "tools/apdb-staging-config.example.json");
const outputPath = path.resolve(process.argv[3] || "dist/apdb-2027-staging");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

assert.equal(config.environment, "staging", "staging configuration required");
assert.equal(config.resetDatabaseOnStart, false, "persistent staging must not reset on start");
assert.match(config.supabaseUrl, /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i, "expected hosted Supabase URL");
assert.doesNotMatch(config.supabaseUrl, /eshbydpsmypflfxpmhyk|localhost|127\.0\.0\.1|YOUR-STAGING/i, "production, local, or placeholder URL cannot be packaged");
assert.match(config.supabaseAnonKey, /^sb_publishable_[A-Za-z0-9_-]+$/i, "a real publishable key is required");
assert.doesNotMatch(config.supabaseAnonKey, /service_role|secret|eyJ/i, "privileged credential is forbidden");
assert.match(config.publicBasePath, /^\/[A-Za-z0-9._/-]+\/$/, "staging must have an isolated base path");
assert.ok(!fs.existsSync(outputPath), `output already exists; refusing to overwrite: ${outputPath}`);

const files = ["index_online.html", "app_online.js", "sw.js", "manifest.json", "icon-192.png", "icon-512.png"];
const bootstrap = `<script>window.APDB_STAGING=true;window.APDB_SECURE_RESULT_RPC=true;window.APDB_SUPABASE_URL=${JSON.stringify(config.supabaseUrl)};window.APDB_SUPABASE_ANON_KEY=${JSON.stringify(config.supabaseAnonKey)};</script>`;
const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
manifest.start_url = config.publicBasePath;
manifest.scope = config.publicBasePath;

fs.mkdirSync(outputPath, { recursive: true });
for (const file of files) {
  const destination = path.join(outputPath, file);
  if (file === "index_online.html") {
    const html = fs.readFileSync(file, "utf8");
    assert.ok(html.includes('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>'), "Supabase client script not found");
    fs.writeFileSync(destination, html.replace('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>', `${bootstrap}\n<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>`));
  } else if (file === "manifest.json") {
    fs.writeFileSync(destination, `${JSON.stringify(manifest, null, 2)}\n`);
  } else {
    fs.copyFileSync(file, destination);
  }
}
console.log(`APDB_STAGING_BUILD_OK output=${outputPath} base=${config.publicBasePath}`);
