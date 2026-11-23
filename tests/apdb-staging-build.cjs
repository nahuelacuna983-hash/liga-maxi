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
  supabaseUrl: "https://wffvmthdmmjwspnozyrv.supabase.co",
  supabaseAnonKey: "sb_publishable_test_only_0123456789",
  publicBasePath: "/apdb-2027-staging/",
  resetDatabaseOnStart: false
};

try {
  fs.writeFileSync(configPath, JSON.stringify(config));
  const result = spawnSync(process.execPath, ["tools/build-apdb-staging.cjs", configPath, outputPath], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const html = fs.readFileSync(path.join(outputPath, "index_online.html"), "utf8");
  const entrypoint = fs.readFileSync(path.join(outputPath, "index.html"), "utf8");
  assert.equal(entrypoint, html, "institutional root must serve the exact same official application");
  assert.ok(html.indexOf("window.APDB_STAGING=true") < html.indexOf("@supabase/supabase-js@2"));
  assert.ok(html.includes("https://wffvmthdmmjwspnozyrv.supabase.co"));
  assert.ok(!html.includes("eshbydpsmypflfxpmhyk.supabase.co"));
  assert.ok(!html.includes("YOUR_STAGING_PUBLISHABLE_OR_ANON_KEY"));
  assert.ok(!html.includes("Las claves actuales siguen funcionando"), "institutional UI must not advertise legacy logins");
  assert.ok(html.includes("Las claves antiguas no están habilitadas"), "missing institutional authentication instructions");
  const app = fs.readFileSync(path.join(outputPath, "app_online.js"), "utf8");
  assert.ok(app.includes("window.APDB_STAGING === true"), "staging guard must remain enabled");
  assert.ok(app.includes("const DELEGADOS = Object.freeze({});"), "legacy delegate lookup must be emptied");
  assert.ok(app.includes("const CLAVES_ASOCIACION = Object.freeze([]);"), "legacy admin lookup must be emptied");
  assert.ok(!app.includes("admin123"), "old admin key reference must not remain anywhere in the package");
  for (const oldCredential of ['"admin123"', '"universal123"', '"meridiano123"', '"platense123"']) {
    assert.ok(!app.includes(oldCredential), `hardcoded legacy password leaked to package: ${oldCredential}`);
  }
  for (const method of ["desbloquearDelegado", "desbloquearAsociacion"]) {
    assert.match(app, new RegExp(`async function ${method}\\(\\) \\{\\s*if \\(window\\.APDB_STAGING === true\\)`), `legacy entrypoint ${method} not fail-closed`);
  }
  const parser = spawnSync(process.execPath, ["--check", path.join(outputPath, "app_online.js")], { encoding: "utf8" });
  assert.equal(parser.status, 0, `generated JS failed syntax check: ${parser.stderr}`);
  assert.ok(app.includes("if (!torneo && TORNEO_ID_FALLBACK)"), "missing guarded tournament fallback");
  assert.ok(app.includes("APP_CONFIG.organizacionActiva.storageSlug = organizacion.slug"), "staging document paths must follow actual organization slug");
  for (const forbidden of [
    "https://eshbydpsmypflfxpmhyk.supabase.co",
    "7d0971e3-66ee-4791-bcbf-bace1d2fefb9",
    "sb_publishable_HtooEUIqEorzX3ODPOwLXQ_iulhXEdL"
  ]) {
    assert.ok(!app.includes(forbidden), `production fallback leaked into staging package: ${forbidden}`);
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(outputPath, "manifest.json"), "utf8"));
  assert.equal(manifest.start_url, config.publicBasePath);
  assert.equal(manifest.scope, config.publicBasePath);
  for (const file of ["app_online.js", "sw.js", "icon-192.png", "icon-512.png"]) {
    assert.ok(fs.existsSync(path.join(outputPath, file)), `${file} missing from package`);
  }

  const overwrite = spawnSync(process.execPath, ["tools/build-apdb-staging.cjs", configPath, outputPath], { encoding: "utf8" });
  assert.notEqual(overwrite.status, 0, "builder must refuse to overwrite an existing output");

  // A package built with production, a secret or a missing key must never be produced.
  for (const [name, changes] of [
    ["production-project", { supabaseUrl: "https://eshbydpsmypflfxpmhyk.supabase.co" }],
    ["missing-publishable-key", { supabaseAnonKey: "" }],
    ["privileged-key", { supabaseAnonKey: "sb_secret_do_not_package" }],
    ["wrong-environment", { environment: "production" }],
    ["reset-enabled", { resetDatabaseOnStart: true }]
  ]) {
    const invalidConfigPath = path.join(root, `invalid-${name}.json`);
    const invalidOutputPath = path.join(root, `invalid-${name}-site`);
    fs.writeFileSync(invalidConfigPath, JSON.stringify({ ...config, ...changes }));
    const rejected = spawnSync(process.execPath, [
      "tools/build-apdb-staging.cjs", invalidConfigPath, invalidOutputPath
    ], { encoding: "utf8" });
    assert.notEqual(rejected.status, 0, `must reject ${name}`);
    assert.ok(!fs.existsSync(invalidOutputPath), `must not create package for ${name}`);
  }
  console.log("APDB_STAGING_BUILD_CONTRACT_OK synthetic_config=true production_fallback=false tournament_fallback=false root_entrypoint=true unsafe_configs_rejected=5 overwrite_refused=true");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
