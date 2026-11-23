"use strict";
// Passive anonymous HTTP release gate for an explicitly specified APdB pilot URL.
// No login, no state changes, no document reads, no redirects, no cookies or secrets.
// A protected pilot should not serve the app or static assets anonymously.
const assert = require("node:assert/strict");

const raw = process.argv[2];
if (!raw) {
  console.error("Usage: node tools/check-apdb-hosted-pilot.cjs https://authorized-host.example/apdb-2027-staging/");
  process.exit(2);
}
let base;
try { base = new URL(raw); } catch { console.error("Invalid pilot URL"); process.exit(2); }
const loopbackTest = process.env.APDB_TEST_LOOPBACK === "1" && base.protocol === "http:" &&
  (base.hostname === "127.0.0.1" || base.hostname === "localhost");
assert.ok(base.protocol === "https:" || loopbackTest, "HTTPS is mandatory outside localhost test");
assert.equal(base.username, "", "Credentials in URLs forbidden");
assert.equal(base.password, "", "Credentials in URLs forbidden");
assert.equal(base.search, "", "Query strings forbidden");
assert.equal(base.hash, "", "Fragments forbidden");
assert.match(base.pathname, /^\/(?:[A-Za-z0-9_-]+\/)+$/, "Dedicated pilot subpath required");
assert.notEqual(base.pathname, "/", "Site root forbidden");
assert.ok(!base.pathname.toLowerCase().includes("2026/"), "2026 production path forbidden");
const paths = [
  ["pilot", "", true],
  ["frontend", "app_online.js", true],
  ["manifest", "manifest.json", true],
  ["integrity", "release-integrity.json", true],
  ["secrets", ".env", false],
  ["config", "config.json", false],
  ["dump", "backup.dump", false]
];
const denied = (status) => [401,403,404].includes(status);
const check = async () => {
  const statuses = [];
  for (const [label,relative,expectedProtected] of paths) {
    const uri = new URL(relative,base);
    assert.equal(uri.origin,base.origin);
    const response = await fetch(uri,{
      method:"GET", redirect:"manual", cache:"no-store",
      headers:{"accept":"text/html,application/json,*/*"},
      signal:AbortSignal.timeout(10000)
    });
    // 30x to a login page may be valid SSO, but requires manual security review;
    // do not silently follow redirect to another domain or claim protected status.
    assert.ok(denied(response.status),
      label+" must not be public or redirect without review (status "+response.status+")");
    const cacheControl=(response.headers.get("cache-control") || "").toLowerCase();
    if(response.status === 401 || response.status === 403) {
      assert.ok(cacheControl.includes("no-store") || cacheControl.includes("private"),
        label+" protected responses should not be publicly cacheable");
    }
    statuses.push(label+":"+response.status);
  }
  console.log("APDB_HOSTED_ANONYMOUS_GATE_OK "+statuses.join(" "));
  console.log("NOTE: anonymous-denial check only; authenticated browser, HTTPS config, and server controls need separate verification.");
};
check().catch(e=>{console.error("APDB_HOSTED_ANONYMOUS_GATE_FAILED",e.message);process.exitCode=1;});
