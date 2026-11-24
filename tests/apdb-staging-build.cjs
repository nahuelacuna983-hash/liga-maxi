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
  publicBasePath: "/apdb-2027-prueba/",
  resetDatabaseOnStart: false
};

try {
  fs.writeFileSync(configPath, JSON.stringify(config));
  const result = spawnSync(process.execPath, ["tools/build-apdb-staging.cjs", configPath, outputPath], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const html = fs.readFileSync(path.join(outputPath, "index_online.html"), "utf8");
  assert.ok(html.indexOf("window.APDB_STAGING=true") < html.indexOf("@supabase/supabase-js@2"));
  assert.ok(html.includes("https://wffvmthdmmjwspnozyrv.supabase.co"));
  assert.ok(!html.includes("eshbydpsmypflfxpmhyk.supabase.co"));
  assert.ok(!html.includes("YOUR_STAGING_PUBLISHABLE_OR_ANON_KEY"));
  assert.equal(fs.readFileSync(path.join(outputPath, "index.html"), "utf8"), html);
  const app = fs.readFileSync(path.join(outputPath, "app_online.js"), "utf8");
  assert.ok(app.includes("window.APDB_STAGING === true"), "staging guard must remain enabled");
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

  const verify = spawnSync(process.execPath, ["tools/verify-apdb-release.cjs", outputPath], { encoding: "utf8" });
  assert.equal(verify.status, 0, verify.stderr || verify.stdout);
  assert.match(verify.stdout, /APDB_RELEASE_PACKAGE_VERIFIED/);

  // Modified files must fail integrity verification before publication.
  const appPath = path.join(outputPath, "app_online.js");
  const original = fs.readFileSync(appPath);
  fs.appendFileSync(appPath, "\\n// tampered");
  const tampered = spawnSync(process.execPath, ["tools/verify-apdb-release.cjs", outputPath], { encoding: "utf8" });
  assert.notEqual(tampered.status, 0, "Modified artifact must be rejected");
  fs.writeFileSync(appPath, original);

  // An unexpected .env or backup is a release-blocking error even if hashes match.
  const extraPath = path.join(outputPath, ".env");
  fs.writeFileSync(extraPath, "APDB_FORBIDDEN_TEST_ONLY=true\n");
  const addedSecret = spawnSync(process.execPath, ["tools/verify-apdb-release.cjs", outputPath], { encoding: "utf8" });
  assert.notEqual(addedSecret.status, 0, "unexpected .env must fail");
  fs.rmSync(extraPath);

  // Symlinks are forbidden even if their bytes match the manifest.
  const iconPath = path.join(outputPath, "icon-192.png");
  const iconOriginal = fs.readFileSync(iconPath);
  fs.rmSync(iconPath);
  try {
    fs.symlinkSync(path.join(process.cwd(), "icon-192.png"), iconPath);
    const linked = spawnSync(process.execPath, ["tools/verify-apdb-release.cjs", outputPath], { encoding: "utf8" });
    assert.notEqual(linked.status, 0, "symlinked asset must fail");
  } finally {
    fs.rmSync(iconPath, { force: true });
    fs.writeFileSync(iconPath, iconOriginal);
  }

  const overwrite = spawnSync(process.execPath, ["tools/build-apdb-staging.cjs", configPath, outputPath], { encoding: "utf8" });
  assert.notEqual(overwrite.status, 0, "builder must refuse to overwrite an existing output");

  // A package built with production, a secret or a missing key must never be produced.
  for (const [name, changes] of [
    ["production-project", { supabaseUrl: "https://eshbydpsmypflfxpmhyk.supabase.co" }],
    ["missing-publishable-key", { supabaseAnonKey: "" }],
    ["privileged-key", { supabaseAnonKey: "sb_secret_do_not_package" }],
    ["wrong-environment", { environment: "production" }],
    ["reset-enabled", { resetDatabaseOnStart: true }],
    ["traversal-path", { publicBasePath: "/apdb/../" }],
    ["root-path", { publicBasePath: "/" }]
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
  console.log("APDB_STAGING_BUILD_CONTRACT_OK synthetic_config=true production_fallback=false tournament_fallback=false unsafe_configs_rejected=7 overwrite_refused=true");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
