"use strict";
// Runs ONLY against disposable Supabase Postgres. Exercises actual SQL roles and
// a synthetic JWT subject, without HTTP login, secrets in source, or persistent changes.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { Client } = require("pg");

const dbUrl = new URL(process.env.DATABASE_URL || "postgresql://localhost/none");
assert.ok(["localhost", "127.0.0.1"].includes(dbUrl.hostname), "REFUSING REMOTE DATABASE");
assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required");

const ORG = "10000000-0000-0000-0000-000000000001";
const TOURNAMENT = "20000000-0000-0000-0000-000000000001";
const CATEGORY = "30000000-0000-0000-0000-000000000001";
const OWN = "40000000-0000-0000-0000-000000000001";
const FOREIGN = "40000000-0000-0000-0000-000000000003";
const subjects = {
  association: crypto.randomUUID(),
  delegate: crypto.randomUUID(),
  noAccess: crypto.randomUUID(),
};
const pg = new Client({ connectionString: process.env.DATABASE_URL });
async function visible(subject, role) {
  assert.ok(["authenticated", "anon"].includes(role), "Unexpected SQL role");
  await pg.query("SAVEPOINT view_role_probe");
  try {
    await pg.query("select set_config('request.jwt.claim.sub', $1, true)", [subject]);
    await pg.query(`SET LOCAL ROLE ${role}`);
    const rows = await pg.query(
      "select equipo_id::text as team from public.v_team_documents_admin where categoria_id = $1 and file_name = 'simulado-no-existe.pdf' order by equipo_id",
      [CATEGORY]
    );
    await pg.query("ROLLBACK TO SAVEPOINT view_role_probe");
    await pg.query("RELEASE SAVEPOINT view_role_probe");
    return rows.rows.map(r => r.team);
  } catch (error) {
    await pg.query("ROLLBACK TO SAVEPOINT view_role_probe").catch(() => {});
    await pg.query("RELEASE SAVEPOINT view_role_probe").catch(() => {});
    if (role === "anon" && error.code === "42501") return [];
    throw new Error(`role=${role} code=${error.code || "unknown"}: ${error.message}`);
  }
}
async function main() {
  await pg.connect();
  await pg.query("BEGIN");
  try {
    const req = crypto.randomUUID();
    await pg.query(
      "insert into public.document_requirements (id, organizacion_id, torneo_id, categoria_id, nombre) values ($1,$2,$3,$4,$5)",
      [req, ORG, TOURNAMENT, CATEGORY, "Requisito sintético de prueba de alcance"]
    );
    for (const team of [OWN, FOREIGN]) {
      await pg.query(
        `insert into public.team_documents
           (requirement_id, organizacion_id, torneo_id, categoria_id, equipo_id, equipo_nombre, file_name)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [req, ORG, TOURNAMENT, CATEGORY, team, "Equipo sintético", "simulado-no-existe.pdf"]
      );
    }
    for (const [role, authId] of Object.entries(subjects)) {
      await pg.query(
        "insert into public.app_users (id,auth_user_id,organizacion_id,display_name,role,active) values ($1,$1,$2,$3,$4,true)",
        [authId, ORG, "Prueba sintética " + role, role === "association" ? "asociacion" : "delegado"]
      );
    }
    await pg.query(
      `insert into public.app_user_permissions
         (user_id,organizacion_id,torneo_id,categoria_id,equipo_id,can_view,can_load_documents)
       values ($1,$2,$3,$4,$5,true,true)`,
      [subjects.delegate, ORG, TOURNAMENT, CATEGORY, OWN]
    );

    const association = await visible(subjects.association, "authenticated");
    const delegate = await visible(subjects.delegate, "authenticated");
    const noAccess = await visible(subjects.noAccess, "authenticated");
    const anon = await visible("00000000-0000-0000-0000-000000000000", "anon");

    assert.deepEqual(association, [OWN, FOREIGN].sort(), "Association should see both documents");
    assert.deepEqual(delegate, [OWN], "Delegate must only see its team's document");
    assert.deepEqual(noAccess, [], "Authenticated user without scope must see nothing");
    assert.deepEqual(anon, [], "Anonymous visitor must see nothing");
    console.log("APDB_ISOLATED_DOCUMENT_VIEW_ROLES_OK association=2 delegate=1 unscoped=0 anonymous=0");
  } finally {
    await pg.query("RESET ROLE").catch(() => {});
    await pg.query("ROLLBACK").catch(() => {});
    await pg.end();
  }
}
main().catch(error => {
  console.error("APDB_ISOLATED_DOCUMENT_VIEW_ROLES_FAILED", error.message);
  process.exitCode = 1;
});
