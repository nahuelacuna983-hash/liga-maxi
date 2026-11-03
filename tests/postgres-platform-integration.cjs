"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { Pool } = require("pg");
const { createDevelopmentAuth } = require("../demo_2027_auth.js");
const { createServer } = require("../demo_2027_postgres_server.js");
const Repository = require("../demo_2027_postgres_repository.js");
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ids = { org: id(701), user: id(702), tournament: id(703), category: id(704), team: id(705), player: id(706), document: id(707), season: id(708), blockedTeam: id(709) };
const pool = () => new Pool({ connectionString: process.env.DATABASE_URL });
const call = async (base, route, method = "GET", payload, token) => { const response = await fetch(`${base}${route}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: payload === undefined ? undefined : JSON.stringify(payload) }); const data = await response.json(); return { response, data }; };
function expectStatus(result, expected, label) { if (result.response.status !== expected) throw new Error(`${label}: HTTP ${result.response.status}, esperado ${expected}, respuesta=${JSON.stringify(result.data)}`); }

(async () => {
  let db;
  let server;
  try {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL es obligatorio.");
    db = pool();
    await db.query(await fs.readFile(path.join(__dirname, "..", "docs", "demo-2027-postgres-schema.sql"), "utf8"));
    await db.query("insert into lm_demo_organizations(id,name) values($1,'Plataforma A') on conflict do nothing", [ids.org]);
    await db.query("insert into lm_demo_users(id,username,role) values($1,'platform-organizer','organizer') on conflict do nothing", [ids.user]);
    await db.query("insert into lm_demo_memberships(user_id,organization_id) values($1,$2) on conflict do nothing", [ids.user, ids.org]);
    await db.query("insert into lm_demo_tournaments(id,organization_id,name,season,state) values($1,$2,'Torneo plataforma',2027,'draft') on conflict do nothing", [ids.tournament, ids.org]);
    await db.query("insert into lm_demo_categories(id,tournament_id,name) values($1,$2,'Categoría plataforma') on conflict do nothing", [ids.category, ids.tournament]);
    await db.query("insert into lm_demo_teams(id,category_id,name) values($1,$2,'Equipo plataforma') on conflict do nothing", [ids.team, ids.category]);
    const auth = createDevelopmentAuth({ secret: "platform-integration-secret", users: { [ids.user]: { id: ids.user, role: "organizer", organizationId: ids.org } } });
    server = createServer({ repository: new Repository(db), auth, requireAuth: true });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const token = auth.issue(ids.user);
    const publicCompetition = await call(base, `/api/public/categories/${ids.category}/competition`); expectStatus(publicCompetition, 200, "consulta pública"); assert.equal(publicCompetition.data.category.id, ids.category);
    const invalidSeason = await call(base, "/api/seasons", "POST", { id: id(710), organizationId: id(999), name: "Temporada ajena", year: 2027 }, token); expectStatus(invalidSeason, 400, "temporada de organización ajena");
    const season = await call(base, "/api/seasons", "POST", { id: ids.season, organizationId: ids.org, name: "Temporada plataforma", year: 2027 }, token); expectStatus(season, 201, "temporada propia"); assert.equal(season.data.organization_id, ids.org);
    const player = await call(base, "/api/players", "POST", { id: ids.player, categoryId: ids.category, teamId: ids.team, name: "Jugador sintético" }, token); expectStatus(player, 201, "alta de jugador");
    const document = await call(base, "/api/documents/reviews", "POST", { id: ids.document, categoryId: ids.category, teamId: ids.team, playerId: ids.player, requirement: "Certificado médico sintético", status: "observed", evidenceRef: "evidencia-sintetica-1" }, token); expectStatus(document, 200, "revisión documental");
    const documents = await call(base, `/api/categories/${ids.category}/documents`, "GET", undefined, token); expectStatus(documents, 200, "consulta documental privada"); assert.equal(documents.data.documents[0].status, "observed"); assert.equal(documents.data.history.length, 1);
    const lifecycle = await call(base, `/api/categories/${ids.category}/lifecycle`, "POST", { state: "officialized" }, token); expectStatus(lifecycle, 200, "oficialización");
    const blocked = await call(base, "/api/teams", "POST", { id: ids.blockedTeam, categoryId: ids.category, name: "No debe ingresar" }, token); expectStatus(blocked, 400, "alta estructural después de oficializar");
    const users = await call(base, `/api/organizations/${ids.org}/users`, "GET", undefined, token); expectStatus(users, 200, "consulta administrativa"); assert.equal(users.data[0].id, ids.user);
    console.log("POSTGRES_PLATFORM_INTEGRATION_OK");
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (db) await db.end();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
