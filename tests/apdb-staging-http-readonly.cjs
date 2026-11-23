"use strict";
// NON-MUTATING acceptance probe for the persistent APdB 2027 staging instance.
// Requires existing synthetic login credentials; never creates users or files.
// Example: APDB_STAGING_PUBLISHABLE_KEY=... APDB_STAGING_CREDS_FILE=/outside/git/test-users.json node tests/apdb-staging-http-readonly.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");

const PROJECT = "wffvmthdmmjwspnozyrv";
const BASE = `https://${PROJECT}.supabase.co`;
const KEY = process.env.APDB_STAGING_PUBLISHABLE_KEY || "";
const FILE = process.env.APDB_STAGING_CREDS_FILE || "";
const CATEGORY = "a7000000-0000-4000-8000-000000000003";
const OWN = "a7000000-0000-4000-8000-000000000011";
const OTHER = "a7000000-0000-4000-8000-000000000012";
assert.ok(KEY.startsWith("sb_publishable_"), "Only the staging publishable key is allowed");
assert.ok(FILE && fs.existsSync(FILE), "Set APDB_STAGING_CREDS_FILE to a private credentials JSON outside Git");
const accounts = JSON.parse(fs.readFileSync(FILE, "utf8"));
for (const role of ["association", "delegate", "noAccess"]) {
  assert.ok(accounts[role]?.email && accounts[role]?.password, `Missing synthetic credentials: ${role}`);
  assert.ok(accounts[role].email.endsWith(".invalid"), `Refusing non-synthetic email for ${role}`);
}
const endpoints = Object.freeze({
  auth: `${BASE}/auth/v1/token?grant_type=password`,
  docs: `${BASE}/rest/v1/v_team_documents_admin?categoria_id=eq.${CATEGORY}&select=id,equipo_id`,
});
async function query(url, options = {}) {
  assert.equal(new URL(url).hostname, `${PROJECT}.supabase.co`, "REFUSING NON-STAGING HOST");
  const result = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
  const body = await result.text();
  let data;
  try { data = JSON.parse(body); } catch { data = null; }
  return { status: result.status, data };
}
const headers = token => ({
  apikey: KEY, Authorization: token ? `Bearer ${token}` : `Bearer ${KEY}`,
});
async function tokenOf(account) {
  const response = await query(endpoints.auth, {
    method: "POST", headers: { apikey: KEY, "content-type": "application/json" },
    body: JSON.stringify({ email: account.email, password: account.password }),
  });
  assert.equal(response.status, 200, "Synthetic account login failed");
  assert.ok(typeof response.data?.access_token === "string", "No JWT returned");
  return response.data.access_token;
}
async function documents(token) {
  const res = await query(endpoints.docs, { method: "GET", headers: headers(token) });
  if (!token && [401, 403].includes(res.status)) return [];
  assert.equal(res.status, 200, `Document view returned HTTP ${res.status}`);
  assert.ok(Array.isArray(res.data), "Expected JSON array");
  return res.data;
}
(async () => {
  // No password or JWT is logged, written to files or included in errors.
  const anon = await documents();
  assert.equal(anon.length, 0, "Anonymous visitor must not read documents");
  const association = await documents(await tokenOf(accounts.association));
  const delegate = await documents(await tokenOf(accounts.delegate));
  const noAccess = await documents(await tokenOf(accounts.noAccess));
  assert.equal(association.length, 2, "Association must see two seeded synthetic documents");
  assert.deepEqual([...new Set(association.map(d => d.equipo_id))].sort(), [OWN, OTHER].sort());
  assert.ok(delegate.length > 0, "Delegate needs a visible team document");
  assert.ok(delegate.every(d => d.equipo_id === OWN), "Delegate escaped own team scope");
  assert.equal(noAccess.length, 0, "Unscoped authenticated account must see zero documents");
  console.log("APDB_STAGING_AUTH_HTTP_READONLY_OK association=2 delegate_scoped=true unscoped=0 anonymous=0 writes=0");
})().catch(e => {
  console.error("APDB_STAGING_AUTH_HTTP_READONLY_FAILED", e.message);
  process.exitCode = 1;
});
