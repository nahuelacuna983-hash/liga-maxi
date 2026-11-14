"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "apdb-staging-build-"));
const configPath = path.join(root, "config.json");
const outputPath = path.join(root, "site");
const config = {
  environment: "staging",
  supabaseUrl: "https://synthetic-staging.supabase.co",
  supabaseAnonKey: "sb_publishable_test_only_0123456789",
  publicBasePath: "/apdb-2027-staging/",
  resetDatabaseOnStart: false
};

try {
  fs.writeFileSync(configPath, JSON.stringify(config));
  const result = spawnSync(process.execPath, ["tools/build-apdb-staging.cjs", configPath, outputPath], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const html = fs.readFileSync(path.join(outputPath, "index_online.html"), "utf8");
  assert.ok(html.indexOf("window.APDB_STAGING=true") < html.indexOf("@supabase/supabase-js@2"));
  assert.ok(html.includes("https://synthetic-staging.supabase.co"));
  assert.ok(!html.includes("eshbydpsmypflfxpmhyk.supabase.co"));
  assert.ok(!html.includes("YOUR_STAGING_PUBLISHABLE_OR_ANON_KEY"));

  const manifest = JSON.parse(fs.readFileSync(path.join(outputPath, "manifest.json"), "utf8"));
  assert.equal(manifest.start_url, config.publicBasePath);
  assert.equal(manifest.scope, config.publicBasePath);
  for (const file of ["app_online.js", "sw.js", "icon-192.png", "icon-512.png"]) {
    assert.ok(fs.existsSync(path.join(outputPath, file)), `${file} missing from package`);
  }

  const overwrite = spawnSync(process.execPath, ["tools/build-apdb-staging.cjs", configPath, outputPath], { encoding: "utf8" });
  assert.notEqual(overwrite.status, 0, "builder must refuse to overwrite an existing output");
  console.log("APDB_STAGING_BUILD_CONTRACT_OK synthetic_config=true production_fallback=false overwrite_refused=true");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
