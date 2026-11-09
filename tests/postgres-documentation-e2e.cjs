"use strict";
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { Pool } = require("pg");
const { createDevelopmentAuth } = require("../demo_2027_auth.js");
const { createServer } = require("../demo_2027_postgres_server.js");
const Repository = require("../demo_2027_postgres_repository.js");
const fs = require("node:fs/promises");
const path = require("node:path");

const ids = {
  org: "00000000-0000-4000-8000-000000000101", organizer: "00000000-0000-4000-8000-000000000201",
  delegate: "00000000-0000-4000-8000-000000000203", tournament: "00000000-0000-4000-8000-000000000901",
  category: "00000000-0000-4000-8000-000000000902", team: "00000000-0000-4000-8000-000000000903",
  player: "00000000-0000-4000-8000-000000000904",
};
const users = {
  "dev-organizer": { id: ids.organizer, role: "organizer", organizationId: ids.org },
  "dev-delegate": { id: ids.delegate, role: "delegate", organizationId: ids.org },
};
const secret = "documentation-e2e-secret-2027";

async function waitFor(url, timeout = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { const response = await fetch(url); if (response.ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timeout esperando ${url}`);
}

(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL es obligatorio; la prueba real no se puede omitir.");
  const db = new Pool({ connectionString: process.env.DATABASE_URL });
  let server;
  let browser;
  try {
    await db.query(await fs.readFile(path.join(__dirname, "..", "docs", "demo-2027-postgres-schema.sql"), "utf8"));
    await db.query("insert into lm_demo_organizations(id,name) values($1,'Documentación E2E') on conflict do nothing", [ids.org]);
    await db.query("insert into lm_demo_users(id,username,role) values($1,'dev-organizer','organizer'),($2,'dev-delegate','delegate') on conflict do nothing", [ids.organizer, ids.delegate]);
    await db.query("insert into lm_demo_memberships(user_id,organization_id) values($1,$2),($3,$2) on conflict do nothing", [ids.organizer, ids.org, ids.delegate]);
    await db.query("insert into lm_demo_tournaments(id,organization_id,name,season,state) values($1,$2,'Documentación E2E',2027,'draft') on conflict do nothing", [ids.tournament, ids.org]);
    await db.query("insert into lm_demo_categories(id,tournament_id,name) values($1,$2,'Femenino E2E') on conflict do nothing", [ids.category, ids.tournament]);
    await db.query("insert into lm_demo_teams(id,category_id,name) values($1,$2,'Equipo E2E') on conflict do nothing", [ids.team, ids.category]);
    await db.query("insert into lm_demo_players(id,organization_id,category_id,team_id,name) values($1,$2,$3,$4,'Jugadora E2E') on conflict do nothing", [ids.player, ids.org, ids.category, ids.team]);
    await db.query("insert into lm_demo_delegate_assignments(user_id,category_id,team_id) values($1,$2,$3) on conflict do nothing", [ids.delegate, ids.category, ids.team]);
    const auth = createDevelopmentAuth({ secret, users });
    server = createServer({ repository: new Repository(db), staticRoot: path.join(__dirname, ".."), auth, requireAuth: true });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    const base = `http://127.0.0.1:${port}`;
    await waitFor(`${base}/health`);
    const child = spawn(process.execPath, [require.resolve("@playwright/test/cli") , "test", "tests/postgres-documentation-browser.spec.cjs"], {
      cwd: path.join(__dirname, ".."), env: { ...process.env, POSTGRES_UI_BASE_URL: `${base}/demo_circuito_2027.html?mode=postgres&api=${base}`, DOC_CATEGORY_ID: ids.category, DOC_PLAYER_ID: ids.player, DOC_TEAM_ID: ids.team, DOC_REQUIREMENT: "Apto físico", DOC_REQUIREMENT2: "Lista de buena fe" }, stdio: "inherit",
    });
    const code = await new Promise((resolve) => child.once("exit", (value) => resolve(value ?? 1)));
    assert.equal(code, 0, "Chromium documental falló");
    await new Promise((resolve) => server.close(resolve));
    server = createServer({ repository: new Repository(db), staticRoot: path.join(__dirname, ".."), auth, requireAuth: true });
    await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
    const token = auth.issue("dev-organizer");
    const response = await fetch(`${base}/api/categories/${ids.category}/documents`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200);
    const state = await response.json();
    assert.equal(state.documents.length, 2);
    assert.equal(state.documents.filter((item) => item.status === "approved").length, 2);
    assert.equal(state.history.length, 4);
    const statusResponse = await fetch(`${base}/api/categories/${ids.category}/players/${ids.player}/document-status`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(statusResponse.status, 200);
    assert.equal((await statusResponse.json()).state, "complete");
    console.log("POSTGRES_DOCUMENTATION_E2E_OK");
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (browser) await browser.close();
    await db.end();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
