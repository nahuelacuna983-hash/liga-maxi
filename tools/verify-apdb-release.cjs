"use strict";
// Verifies a generated APdB pilot package without network access or credentials.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(process.argv[2] || "");
assert.ok(process.argv[2], "Usage: node tools/verify-apdb-release.cjs <package-directory>");
const metadata = JSON.parse(fs.readFileSync(path.join(root, "release-integrity.json"), "utf8"));
assert.equal(metadata.format, "apdb-institutional-package-integrity-v1");
assert.equal(metadata.environment, "staging");
assert.match(metadata.publicBasePath, /^\/(?:[A-Za-z0-9_-]+\/)+$/);
const allowed = new Set([
  "index_online.html", "app_online.js", "apdb-administrative-adapter.js",
  "sw.js", "manifest.json", "icon-192.png", "icon-512.png"
]);
assert.deepEqual(metadata.files.map((f) => f.file).sort(), [...allowed].sort());
for (const entry of metadata.files) {
  assert.ok(allowed.has(entry.file));
  assert.ok(!entry.file.includes(".."));
  const data = fs.readFileSync(path.join(root, entry.file));
  assert.equal(entry.bytes, data.length, "Size changed: " + entry.file);
  assert.equal(entry.sha256, crypto.createHash("sha256").update(data).digest("hex"), "Hash changed: " + entry.file);
}
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
assert.equal(manifest.scope, metadata.publicBasePath);
assert.equal(manifest.start_url, metadata.publicBasePath);
const html = fs.readFileSync(path.join(root, "index_online.html"), "utf8");
const js = fs.readFileSync(path.join(root, "app_online.js"), "utf8");
assert.ok(html.includes("window.APDB_STAGING=true"));
assert.ok(html.includes("window.APDB_SECURE_RESULT_RPC=true"));
assert.ok(html.includes("https://wffvmthdmmjwspnozyrv.supabase.co"));
assert.ok(js.includes("apdb_list_player_documents"));
assert.ok(js.includes("apdb_list_team_documents"));
assert.ok(!js.includes('.from("v_team_documents_admin")'));
assert.ok(!js.includes('.from("v_player_documents_admin")'));
for (const content of [html,js]) {
  assert.ok(!content.includes("eshbydpsmypflfxpmhyk.supabase.co"), "Production endpoint exposed");
  assert.ok(!content.includes("7d0971e3-66ee-4791-bcbf-bace1d2fefb9"), "Production tournament exposed");
  assert.ok(!content.includes("sb_publishable_HtooEUIqEorzX3ODPOwLXQ_iulhXEdL"), "Production project key exposed");
  assert.ok(!/sb_secret_[A-Za-z0-9_-]+/.test(content), "Secret project key exposed");
}
console.log("APDB_RELEASE_PACKAGE_VERIFIED files=" + allowed.size);
