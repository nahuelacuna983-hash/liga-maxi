"use strict";
// Create a disposable copy of the *actual packaged application* for browser testing.
// The packager is production-safe: it accepts only the real APdB staging hostname.
// AFTER packaging, this CI-only script redirects the bundle to a local disposable
// Supabase instance and never publishes those changes.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const baseUrl = process.env.SUPABASE_URL || "";
const localKey = process.env.SUPABASE_ANON_KEY || "";
const target = path.resolve("apdb-2027-prueba");
const stagingUrl = "https://wffvmthdmmjwspnozyrv.supabase.co";
const syntheticKey = "sb_publishable_isolated_ci_only_0123456789";
assert.match(baseUrl, /^http:\/\/(?:localhost|127\.0\.0\.1):\d+\/?$/, "REFUSING NONLOCAL SUPABASE");
assert.ok(localKey.length > 20, "Isolated anon key unavailable");
assert.ok(!fs.existsSync(target), "Institutional test output already exists");
const configFile = path.resolve("test-results/apdb-institutional-test-config.json");
fs.mkdirSync(path.dirname(configFile), { recursive: true });
try {
  fs.writeFileSync(configFile, JSON.stringify({
    environment: "staging",
    supabaseUrl: stagingUrl,
    supabaseAnonKey: syntheticKey,
    publicBasePath: "/apdb-2027-prueba/",
    resetDatabaseOnStart: false
  }));
  const built = spawnSync(process.execPath,
    ["tools/build-apdb-staging.cjs", configFile, target], { encoding: "utf8" });
  assert.equal(built.status, 0, built.stderr || built.stdout);
  for (const name of ["index.html", "index_online.html"]) {
    const file = path.join(target, name);
    let html = fs.readFileSync(file, "utf8");
    assert.ok(html.includes(stagingUrl) && html.includes(syntheticKey), "Unexpected staging bootstrap");
    html = html.replaceAll(stagingUrl, baseUrl.replace(/\/$/, ""))
      .replaceAll(syntheticKey, localKey);
    fs.writeFileSync(file, html);
  }
  const js = fs.readFileSync(path.join(target, "app_online.js"), "utf8");
  assert.ok(js.includes("const DELEGADOS = Object.freeze({});"));
  assert.ok(js.includes("const CLAVES_ASOCIACION = Object.freeze([]);"));
  assert.ok(!js.includes("admin123"), "Legacy admin credential leaked");
  assert.ok(!js.includes("universal123"), "Legacy delegate credential leaked");
  const parsed = spawnSync(process.execPath, ["--check", path.join(target, "app_online.js")], { encoding: "utf8" });
  assert.equal(parsed.status, 0, parsed.stderr);
  console.log("APDB_ISOLATED_INSTITUTIONAL_BUILD_OK legacy_keys=false auth_only=true local_backend=true");
} finally {
  fs.rmSync(configFile, { force: true });
}
