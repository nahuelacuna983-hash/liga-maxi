"use strict";
// Passive authenticated GET verification for APdB cPanel release. No upload or mutations.
// Credentials supplied via environment only; never printed or included in the URL.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const [rawBase, rawDirectory] = process.argv.slice(2);
assert.ok(rawBase && rawDirectory,
  "Usage: APDB_HOST_BASIC_USER=... APDB_HOST_BASIC_PASSWORD=... node tools/check-apdb-hosted-release.cjs https://maxibasquetlaplata.com.ar/apdb-2027-prueba/ /path/to/release");
const base = new URL(rawBase);
const loopbackTest = process.env.APDB_TEST_LOOPBACK === "1" &&
  base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname);
assert.ok(base.protocol === "https:" || loopbackTest, "HTTPS required outside local test");
assert.equal(base.username, "", "URL credentials forbidden");
assert.equal(base.password, "", "URL credentials forbidden");
assert.equal(base.search, "");
assert.equal(base.hash, "");
assert.equal(base.pathname, "/apdb-2027-prueba/", "APdB pilot path mismatch");
if (!loopbackTest) {
  assert.equal(base.hostname, "maxibasquetlaplata.com.ar", "APdB institutional host required");
  assert.equal(base.port, "", "Unexpected hosting port");
}
const user = process.env.APDB_HOST_BASIC_USER;
const password = process.env.APDB_HOST_BASIC_PASSWORD;
assert.ok(user && password && !/[\r\n:]/.test(user) && !/[\r\n]/.test(password),
  "HTTP Basic credentials must be supplied securely in environment");
const root = path.resolve(rawDirectory);
const verification = spawnSync(process.execPath, ["tools/verify-apdb-release.cjs", root], { encoding: "utf8" });
assert.equal(verification.status, 0, verification.stderr || verification.stdout);
const integrity = JSON.parse(fs.readFileSync(path.join(root, "release-integrity.json"), "utf8"));
assert.equal(integrity.publicBasePath, base.pathname, "Build path does not match the hosting path");
const auth = "Basic " + Buffer.from(user + ":" + password).toString("base64");
const expectedFiles = ["release-integrity.json", ...integrity.files.map(f => f.file)];
const fileHash = data => crypto.createHash("sha256").update(data).digest("hex");
(async () => {
  for (const file of expectedFiles) {
    const target = new URL(file, base);
    assert.equal(target.origin, base.origin);
    const response = await fetch(target, {
      method: "GET", redirect: "manual", cache: "no-store",
      headers: { authorization: auth },
      signal: AbortSignal.timeout(12000)
    });
    assert.equal(response.status, 200, "Restricted asset not served correctly: " + file + " (" + response.status + ")");
    assert.equal(response.url, target.href, "Unexpected redirect URL for " + file);
    const remote = Buffer.from(await response.arrayBuffer());
    const local = fs.readFileSync(path.join(root, file));
    assert.equal(remote.length, local.length, "Remote file length differs: " + file);
    assert.equal(fileHash(remote), fileHash(local), "Remote SHA-256 differs: " + file);
    if (file.endsWith(".js")) {
      assert.match(response.headers.get("content-type") || "", /javascript|ecmascript/i, "Unexpected JS MIME type");
    } else if (file.endsWith(".json")) {
      assert.match(response.headers.get("content-type") || "", /json/i, "Unexpected JSON MIME type");
    }
  }
  // A web server must not expose helper files that are not part of the release.
  for (const forbidden of [".env", "config.json", "backup.dump", "supabase/config.toml"]) {
    const response = await fetch(new URL(forbidden, base), {
      method: "GET", redirect: "manual", cache: "no-store",
      headers: { authorization: auth },
      signal: AbortSignal.timeout(12000)
    });
    assert.ok([403, 404].includes(response.status),
      "Forbidden file URL must be 403/404 (not 200 or redirect): " + forbidden);
  }
  console.log("APDB_CPANEL_AUTHENTICATED_RELEASE_OK files=" + expectedFiles.length +
    " sha256_verified=true forbidden_paths=4");
})().catch(err => { console.error("APDB_CPANEL_AUTHENTICATED_RELEASE_FAILED", err.message); process.exitCode = 1; });
