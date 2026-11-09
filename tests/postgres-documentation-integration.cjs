"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { Pool } = require("pg");
const { createDevelopmentAuth } = require("../demo_2027_auth.js");
const { createServer } = require("../demo_2027_postgres_server.js");
const Repository = require("../demo_2027_postgres_repository.js");
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ids = { org: id(811), organizer: id(812), delegate: id(813), otherDelegate: id(814), tournament: id(815), category: id(816), team: id(817), player: id(818), requirement: id(819), document: id(820) };
const call = async (base, route, method, payload, token) => { const response = await fetch(`${base}${route}`, { method, headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }); const data = await response.json(); return { response, data }; };

(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL es obligatorio para esta prueba.");
  const db = new Pool({ connectionString: process.env.DATABASE_URL }); let server;
  try {
    await db.query(await fs.readFile(path.join(__dirname, "..", "docs", "demo-2027-postgres-schema.sql"), "utf8"));
    await db.query("insert into lm_demo_organizations(id,name) values($1,'Documentación APdB sintética') on conflict do nothing", [ids.org]);
    await db.query("insert into lm_demo_users(id,username,role) values($1,'doc-organizer','organizer'),($2,'doc-delegate','delegate'),($3,'doc-other','delegate') on conflict do nothing", [ids.organizer, ids.delegate, ids.otherDelegate]);
    await db.query("insert into lm_demo_memberships(user_id,organization_id) values($1,$2),($3,$2) on conflict do nothing", [ids.organizer, ids.org, ids.delegate]);
    await db.query("insert into lm_demo_tournaments(id,organization_id,name,season,state) values($1,$2,'Documentación Femenino',2027,'draft') on conflict do nothing", [ids.tournament, ids.org]);
    await db.query("insert into lm_demo_categories(id,tournament_id,name) values($1,$2,'Femenino') on conflict do nothing", [ids.category, ids.tournament]);
    await db.query("insert into lm_demo_teams(id,category_id,name) values($1,$2,'Femenino Norte') on conflict do nothing", [ids.team, ids.category]);
    await db.query("insert into lm_demo_players(id,organization_id,category_id,team_id,name) values($1,$2,$3,$4,'Jugadora persistente') on conflict do nothing", [ids.player, ids.org, ids.category, ids.team]);
    await db.query("insert into lm_demo_document_requirements(id,organization_id,category_id,team_id,name) values($1,$2,$3,$4,'Apto físico') on conflict do nothing", [ids.requirement, ids.org, ids.category, ids.team]);
    await db.query("insert into lm_demo_delegate_assignments(user_id,category_id,team_id) values($1,$2,$3) on conflict do nothing", [ids.delegate, ids.category, ids.team]);
    const auth = createDevelopmentAuth({ secret: "documentation-integration-secret", users: { [ids.organizer]: { id: ids.organizer, role: "organizer", organizationId: ids.org }, [ids.delegate]: { id: ids.delegate, role: "delegate", organizationId: ids.org }, [ids.otherDelegate]: { id: ids.otherDelegate, role: "delegate", organizationId: ids.org } } });
    server = createServer({ repository: new Repository(db), auth, requireAuth: true }); await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve)); const base = `http://127.0.0.1:${server.address().port}`;
    const delegateToken = auth.issue(ids.delegate); const otherToken = auth.issue(ids.otherDelegate); const organizerToken = auth.issue(ids.organizer);
    const submitted = await call(base, "/api/documents/submissions", "POST", { id: ids.document, playerId: ids.player, requirement: "Apto físico", evidenceRef: "apto-ficticio.pdf" }, delegateToken); assert.equal(submitted.response.status, 201);
    const denied = await call(base, "/api/documents/submissions", "POST", { id: id(821), playerId: ids.player, requirement: "Apto físico", evidenceRef: "ajeno.pdf" }, otherToken); assert.equal(denied.response.status, 400);
    const reviewed = await call(base, "/api/documents/reviews", "POST", { id: ids.document, categoryId: ids.category, playerId: ids.player, teamId: ids.team, requirement: "Apto físico", status: "approved", evidenceRef: "apto-ficticio.pdf" }, organizerToken); assert.equal(reviewed.response.status, 200);
    const documents = await call(base, `/api/categories/${ids.category}/documents`, "GET", {}, organizerToken); assert.equal(documents.response.status, 200); assert.equal(documents.data.documents[0].status, "approved"); assert.equal(documents.data.history.length, 2);
    console.log("POSTGRES_DOCUMENTATION_INTEGRATION_OK");
  } finally { if (server) await new Promise((resolve) => server.close(resolve)); await db.end(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
