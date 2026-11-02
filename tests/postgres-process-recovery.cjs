"use strict";

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");
const { Pool } = require("pg");

const ids = { tournament: "00000000-0000-4000-8000-000000000601", category: "00000000-0000-4000-8000-000000000602", teams: ["00000000-0000-4000-8000-000000000603", "00000000-0000-4000-8000-000000000604", "00000000-0000-4000-8000-000000000605", "00000000-0000-4000-8000-000000000606"], match: "00000000-0000-4000-8000-000000000607", actor: "00000000-0000-4000-8000-000000000608" };
const dbUrl = process.env.DATABASE_URL;
const port = Number(process.env.POSTGRES_RECOVERY_PORT || 8897);
const base = `http://127.0.0.1:${port}`;
const request = async (route, method = "GET", payload) => { const response = await fetch(`${base}${route}`, { method, headers: { "content-type": "application/json" }, body: payload === undefined ? undefined : JSON.stringify(payload) }); const data = await response.json(); if (!response.ok) throw new Error(`${method} ${route} HTTP ${response.status}: ${data.error || JSON.stringify(data)}`); return data; };
const start = () => { const child = spawn(process.execPath, [path.join(__dirname, "..", "demo_2027_postgres_server.js")], { env: { ...process.env, DATABASE_URL: dbUrl, PORT: String(port), LM_REQUIRE_AUTH: "0" }, stdio: ["ignore", "pipe", "pipe"] }); return child; };
const stop = (child) => new Promise((resolve, reject) => { child.once("exit", resolve); child.once("error", reject); child.kill("SIGTERM"); });
const waitForServer = async () => { for (let i = 0; i < 50; i += 1) { try { await request("/health"); return; } catch { await new Promise((resolve) => setTimeout(resolve, 100)); } } throw new Error("El backend no inició a tiempo."); };

(async () => {
  if (!dbUrl) throw new Error("DATABASE_URL es obligatorio para la recuperación PostgreSQL.");
  const setup = new Pool({ connectionString: dbUrl });
  await setup.query(await fs.readFile(path.join(__dirname, "..", "docs", "demo-2027-postgres-schema.sql"), "utf8"));
  await setup.query("insert into lm_demo_tournaments(id,organization_id,name,season,state) values($1,'00000000-0000-4000-8000-000000000101','Recovery física',2027,'draft') on conflict (id) do nothing", [ids.tournament]);
  await setup.query("insert into lm_demo_categories(id,tournament_id,name) values($1,$2,'Recovery') on conflict (id) do nothing", [ids.category, ids.tournament]);
  await setup.query("insert into lm_demo_teams(id,category_id,name) values($1,$5,'R1'),($2,$5,'R2'),($3,$5,'R3'),($4,$5,'R4') on conflict (id) do nothing", [...ids.teams, ids.category]);
  await setup.end();

  let server = start(); await waitForServer();
  await request(`/api/fixtures`, "POST", { categoryId: ids.category, actorId: ids.actor, matches: [{ id: ids.match, round: 0, homeTeamId: ids.teams[0], awayTeamId: ids.teams[1] }] });
  await request(`/api/matches/${ids.match}/result`, "POST", { actorId: ids.actor, homeScore: 80, awayScore: 70 });
  const before = await request(`/api/categories/${ids.category}`);
  assert.equal(before.matches[0].home_score, 80);
  assert.ok(before.history.some((entry) => entry.action === "result_saved"));
  await stop(server);

  server = start(); await waitForServer();
  const after = await request(`/api/categories/${ids.category}`);
  assert.deepEqual(after.matches, before.matches, "el partido debe conservarse tras reiniciar el proceso");
  assert.deepEqual(after.history, before.history, "el historial debe conservarse tras reiniciar el proceso");
  await stop(server);
  console.log("POSTGRES_PROCESS_RECOVERY_OK");
})().catch((error) => { console.error(error); process.exitCode = 1; });
