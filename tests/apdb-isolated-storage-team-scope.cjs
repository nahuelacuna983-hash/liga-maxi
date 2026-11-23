"use strict";
// Real Auth JWT + private Storage HTTP regression, on disposable local Supabase only.
// Applies the candidate team-scoped policies only inside the disposable CI database.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

for (const key of [
  "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL", "APDB_BROWSER_CREDENTIALS_FILE"
]) assert.ok(process.env[key], `Missing isolated test variable ${key}`);

const base = process.env.SUPABASE_URL.replace(/\/$/, "");
assert.match(base, /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i, "HOSTED TARGET REFUSED");
const dbUrl = new URL(process.env.DATABASE_URL);
assert.ok(["127.0.0.1", "localhost"].includes(dbUrl.hostname), "REMOTE DATABASE REFUSED");
const creds = JSON.parse(fs.readFileSync(process.env.APDB_BROWSER_CREDENTIALS_FILE, "utf8"));
const objectBase = "/storage/v1/object/documentos/";
const prefix = "apdb-test-a/2027-test/categoria-sintetica-a/";
const teamA = "40000000-0000-0000-0000-000000000001";
const teamOther = "40000000-0000-0000-0000-000000000003";
const runId = crypto.randomUUID().slice(0, 8);
const nameA = `${prefix}${teamA}/prueba/${runId}-norte.pdf`;
const nameOther = `${prefix}${teamOther}/prueba/${runId}-sur.pdf`;
const nameOwn = `${prefix}${teamA}/prueba/${runId}-delegado.pdf`;
const allNames = [nameA, nameOther, nameOwn];
const pg = new Client({ connectionString: process.env.DATABASE_URL });

function urlPart(name) { return name.split("/").map(encodeURIComponent).join("/"); }
function authHeader(token) {
  return { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` };
}
async function call(endpoint, opts = {}) {
  const response = await fetch(`${base}${endpoint}`, opts);
  return { status: response.status, ok: response.ok, body: await response.text() };
}
async function login({ email, password }) {
  const result = await call("/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: process.env.SUPABASE_ANON_KEY, "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  assert.equal(result.status, 200, "Synthetic Auth login failed");
  return JSON.parse(result.body).access_token;
}
function upload(token, name) {
  return call(`${objectBase}${urlPart(name)}`, {
    method: "POST",
    headers: { ...authHeader(token), "content-type": "application/pdf", "x-upsert": "false" },
    body: Buffer.from("%PDF-1.4\n% APdB synthetic CI only\n")
  });
}
function sign(token, name) {
  return call(`/storage/v1/object/sign/documentos/${urlPart(name)}`, {
    method: "POST",
    headers: { ...authHeader(token), "content-type": "application/json" },
    body: JSON.stringify({ expiresIn: 60 })
  });
}
function requireAllowed(result, label) {
  assert.ok(result.ok, `${label} expected allowed, got HTTP ${result.status}: ${result.body.slice(0, 240)}`);
}
function requireDenied(result, label) {
  assert.ok(!result.ok, `${label} expected denied, got HTTP ${result.status}`);
}

(async () => {
  await pg.connect();
  let delegatePermissionPrevious = null;
  try {
    const fixture = fs.readFileSync(path.join(__dirname, "fixtures", "apdb-storage-team-scoped-candidate.sql"), "utf8");
    await pg.query(fixture);
    // Synthetic delegates need the same document scope as a real team delegate.
    const rows = await pg.query(
      "update public.app_user_permissions set can_load_documents = true where user_id = $1 and equipo_id = $2 returning id, can_load_documents",
      [creds.delegate.authUserId, teamA]
    );
    assert.equal(rows.rowCount, 1, "Expected exactly one synthetic delegate permission");
    delegatePermissionPrevious = false; // browser setup initially leaves it false
    const [assoc, delegate] = await Promise.all([login(creds.association), login(creds.delegate)]);
    requireAllowed(await upload(assoc, nameA), "Association team A upload");
    requireAllowed(await upload(assoc, nameOther), "Association team B upload");
    requireAllowed(await upload(delegate, nameOwn), "Delegate own team upload");
    requireDenied(await upload(delegate, `${prefix}${teamOther}/prueba/${runId}-denied.pdf`), "Delegate foreign team upload");
    requireDenied(await upload(delegate, `apdb-test-b/2027-test/categoria-sintetica-b/40000000-0000-0000-0000-000000000002/prueba/${runId}-denied.pdf`), "Delegate other organization upload");
    requireDenied(await upload(delegate, `${prefix}not-a-uuid/prueba/${runId}-denied.pdf`), "Malformed team path");
    requireAllowed(await sign(assoc, nameA), "Association own team signed URL");
    requireAllowed(await sign(assoc, nameOther), "Association second team signed URL");
    requireAllowed(await sign(delegate, nameA), "Delegate own team signed URL");
    requireDenied(await sign(delegate, nameOther), "Delegate foreign team signed URL");
    requireDenied(await sign(process.env.SUPABASE_ANON_KEY, nameA), "Anonymous document signed URL");
    const revoked = await pg.query(
      "update public.app_user_permissions set can_load_documents = false where user_id = $1 and equipo_id = $2",
      [creds.delegate.authUserId, teamA]
    );
    assert.equal(revoked.rowCount, 1);
    requireDenied(await sign(delegate, nameA), "Revoked delegate, same JWT");
    console.log("APDB_ISOLATED_STORAGE_TEAM_SCOPE_OK auth_jwt=true cross_team_denied=true anonymous_denied=true revocation_denied=true");
  } finally {
    if (delegatePermissionPrevious !== null) {
      await pg.query(
        "update public.app_user_permissions set can_load_documents = $1 where user_id = $2 and equipo_id = $3",
        [delegatePermissionPrevious, creds.delegate.authUserId, teamA]
      );
    }
    for (const name of allNames) {
      await call(`${objectBase}${urlPart(name)}`, {
        method: "DELETE",
        headers: authHeader(process.env.SUPABASE_SERVICE_ROLE_KEY)
      }).catch(() => {});
    }
    await pg.end();
  }
})().catch((error) => {
  console.error(`APDB_ISOLATED_STORAGE_TEAM_SCOPE_FAILED ${error.message}`);
  process.exitCode = 1;
});
