"use strict";
const crypto = require("node:crypto");
const { Client } = require("pg");

for (const key of ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL", "GITHUB_ENV"]) {
  if (!process.env[key]) throw new Error(`${key} is required`);
}
if (/supabase\.co$/i.test(process.env.SUPABASE_URL)) throw new Error("Hosted Supabase target refused");
const run = crypto.randomUUID().replaceAll("-", "").slice(0, 10);
const email = `browser-association-${run}@example.invalid`;
const delegateEmail = `browser-delegate-${run}@example.invalid`;
const password = `Browser-${crypto.randomBytes(12).toString("hex")}!a1`;

(async () => {
  const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true })
  });
  if (response.status !== 200) throw new Error(`browser auth setup failed: ${response.status}`);
  const user = await response.json();
  const delegateResponse = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ email: delegateEmail, password, email_confirm: true })
  });
  if (delegateResponse.status !== 200) throw new Error(`browser delegate setup failed: ${delegateResponse.status}`);
  const delegate = await delegateResponse.json();
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("insert into app_users (id, auth_user_id, organizacion_id, display_name, role) values ($1,$1,'10000000-0000-0000-0000-000000000001',$2,'asociacion')", [user.id, `Browser Asociación ${run}`]);
    await client.query("insert into app_user_permissions (user_id, organizacion_id, torneo_id, categoria_id, can_view, can_load_results, can_correct_results, can_manage_tournaments) values ($1,'10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',true,true,true,true)", [user.id]);
    await client.query("insert into app_users (id, auth_user_id, organizacion_id, display_name, role) values ($1,$1,'10000000-0000-0000-0000-000000000001',$2,'delegado')", [delegate.id, `Browser Delegado ${run}`]);
    await client.query("insert into app_user_permissions (user_id, organizacion_id, torneo_id, categoria_id, equipo_id, equipo_nombre, can_view, can_load_results) values ($1,'10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','Equipo sintético A',true,true)", [delegate.id]);
  } finally { await client.end(); }
  const credentialsFile = require("node:path").join(process.env.RUNNER_TEMP || require("node:os").tmpdir(), `apdb-browser-${run}.json`);
  require("node:fs").writeFileSync(credentialsFile, JSON.stringify({ association: { email, password }, delegate: { email: delegateEmail, password } }), { encoding: "utf8", mode: 0o600 });
  require("node:fs").appendFileSync(process.env.GITHUB_ENV, `APDB_BROWSER_CREDENTIALS_FILE=${credentialsFile}\n`);
  console.log("APDB_ISOLATED_BROWSER_USER_READY");
})().catch((error) => { console.error(`APDB_ISOLATED_BROWSER_SETUP_FAILED ${error.message}`); process.exitCode = 1; });
