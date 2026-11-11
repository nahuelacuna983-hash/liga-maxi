"use strict";
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { Client } = require("pg");

for (const name of ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL"]) {
  assert.ok(process.env[name], `${name} is required in the isolated runner`);
}
assert.doesNotMatch(process.env.SUPABASE_URL, /supabase\.co$/i, "Refusing a hosted Supabase target");
const base = process.env.SUPABASE_URL.replace(/\/$/, "");
const run = crypto.randomUUID().slice(0, 8);
const password = `Aislamiento-${crypto.randomBytes(12).toString("hex")}!a1`;
const users = {
  association: { email: `association-${run}@example.invalid` },
  delegateA: { email: `delegate-a-${run}@example.invalid` },
  delegateB: { email: `delegate-b-${run}@example.invalid` },
};
const orgA = "10000000-0000-0000-0000-000000000001";
const orgB = "10000000-0000-0000-0000-000000000002";
const categoryA = "30000000-0000-0000-0000-000000000001";
const matchA = crypto.randomUUID();

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const text = await response.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { response, body };
}
async function createAuthUser(email) {
  const result = await request("/auth/v1/admin/users", {
    method: "POST",
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  assert.equal(result.response.status, 200, `Auth user creation failed: ${result.response.status}`);
  return result.body.id;
}
async function login(email) {
  const result = await request("/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: process.env.SUPABASE_ANON_KEY, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(result.response.status, 200, `Auth login failed: ${result.response.status}`);
  return result.body.access_token;
}

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const ids = {};
    for (const [key, user] of Object.entries(users)) ids[key] = await createAuthUser(user.email);
    await client.query("insert into app_users (id, auth_user_id, organizacion_id, display_name, role) values ($1,$1,$2,'Asociacion test','asociacion'),($3,$3,$2,'Delegado A','delegado'),($4,$4,$5,'Delegado B','delegado')", [ids.association, orgA, ids.delegateA, ids.delegateB, orgB]);
    await client.query("insert into app_user_permissions (user_id, organizacion_id, torneo_id, categoria_id, can_view, can_load_results) values ($1,$2,'20000000-0000-0000-0000-000000000001',$3,true,true)", [ids.delegateA, orgA, categoryA]);
    await client.query("insert into partidos (id, categoria_id, local, visitante) values ($1,$2,'Equipo sintético A','Equipo sintético A visitante')", [matchA, categoryA]);
    const delegateToken = await login(users.delegateA.email);
    const allowed = await request("/rest/v1/rpc/apdb_save_result", { method: "POST", headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${delegateToken}`, "content-type": "application/json" }, body: JSON.stringify({ p_match_id: matchA, p_home_score: 80, p_away_score: 70 }) });
    assert.equal(allowed.response.status, 200, `Authorized delegate rejected: ${allowed.response.status}`);
    await client.query("update app_users set active = false where auth_user_id = $1", [ids.delegateA]);
    const revoked = await request("/rest/v1/rpc/apdb_save_result", { method: "POST", headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${delegateToken}`, "content-type": "application/json" }, body: JSON.stringify({ p_match_id: matchA, p_home_score: 81, p_away_score: 70 }) });
    assert.notEqual(revoked.response.status, 200, "Revoked delegate modified a result");
    const otherToken = await login(users.delegateB.email);
    const crossOrg = await request("/rest/v1/rpc/apdb_save_result", { method: "POST", headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${otherToken}`, "content-type": "application/json" }, body: JSON.stringify({ p_match_id: matchA, p_home_score: 82, p_away_score: 70 }) });
    assert.notEqual(crossOrg.response.status, 200, "Cross-organization delegate modified a result");
    console.log("APDB_SUPABASE_ISOLATED_INTEGRATION_OK");
  } finally {
    await client.query("delete from partidos where id = $1", [matchA]).catch(() => {});
    await client.end();
  }
})().catch((error) => { console.error(`APDB_SUPABASE_ISOLATED_INTEGRATION_FAILED ${error.message}`); process.exitCode = 1; });
