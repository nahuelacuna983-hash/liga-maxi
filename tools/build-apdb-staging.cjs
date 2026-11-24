"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const configPath = path.resolve(process.argv[2] || "tools/apdb-staging-config.example.json");
const outputPath = path.resolve(process.argv[3] || "dist/apdb-2027-staging");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

assert.equal(config.environment, "staging", "staging configuration required");
assert.equal(config.resetDatabaseOnStart, false, "persistent staging must not reset on start");
assert.match(config.supabaseUrl, /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i, "expected hosted Supabase URL");
assert.match(config.supabaseUrl, /^https:\/\/wffvmthdmmjwspnozyrv\.supabase\.co\/?$/i, "only APdB staging can be packaged");
assert.match(config.supabaseAnonKey, /^sb_publishable_[A-Za-z0-9_-]+$/i, "a real publishable key is required");
assert.doesNotMatch(config.supabaseAnonKey, /service_role|secret|eyJ/i, "privileged credential is forbidden");
assert.match(config.publicBasePath, /^\/(?:[A-Za-z0-9_-]+\/)+$/, "staging base path must use safe segments, never dots or traversal");
assert.notEqual(config.publicBasePath, "/", "pilot must not overwrite the site root");
assert.ok(!fs.existsSync(outputPath), `output already exists; refusing to overwrite: ${outputPath}`);

const files = ["index_online.html", "app_online.js", "apdb-administrative-adapter.js", "sw.js", "manifest.json", "icon-192.png", "icon-512.png"];
const productionUrl = "https://eshbydpsmypflfxpmhyk.supabase.co";
const productionTournament = "7d0971e3-66ee-4791-bcbf-bace1d2fefb9";
const productionPublishableKey = "sb_publishable_HtooEUIqEorzX3ODPOwLXQ_iulhXEdL";
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
  } else if (file === "app_online.js") {
    let app = fs.readFileSync(file, "utf8");
    assert.ok(app.includes(productionUrl), "source expected to contain a known production fallback");
    assert.ok(app.includes(productionTournament), "source expected to contain a known tournament fallback");
    assert.ok(app.includes(productionPublishableKey), "source expected to contain a known key fallback");
    app = app.replaceAll(productionUrl, "");
    app = app.replaceAll(productionTournament, "");
    app = app.replaceAll(productionPublishableKey, "");
    // The staging bootstrap must supply its own project configuration.
    assert.ok(app.includes("window.APDB_STAGING === true"), "missing staging fail-closed guard");
    for (const forbidden of [productionUrl, productionTournament, productionPublishableKey]) {
      assert.ok(!app.includes(forbidden), "production reference remained in staged JavaScript");
    }
    fs.writeFileSync(destination, app);
  } else if (file === "manifest.json") {
    fs.writeFileSync(destination, `${JSON.stringify(manifest, null, 2)}\n`);
  } else {
    fs.copyFileSync(file, destination);
  }
}
console.log(`APDB_STAGING_BUILD_OK output=${outputPath} base=${config.publicBasePath}`);


// Manifest describes the complete public package without embedding credentials.
// Publishable frontend keys are expected in HTML; never include private tokens.
const entries = files.map((file) => ({
  file,
  bytes: fs.statSync(path.join(outputPath, file)).size,
  sha256: crypto.createHash("sha256").update(fs.readFileSync(path.join(outputPath, file))).digest("hex")
})).sort((a,b) => a.file.localeCompare(b.file));
fs.writeFileSync(path.join(outputPath, "release-integrity.json"), JSON.stringify({
  format: "apdb-institutional-package-integrity-v1",
  environment: "staging",
  publicBasePath: config.publicBasePath,
  files: entries
}, null, 2) + "\n");
console.log("APDB_INTEGRITY_MANIFEST_OK files=" + entries.length);
