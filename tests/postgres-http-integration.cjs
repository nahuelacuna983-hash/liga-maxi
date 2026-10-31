"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { Pool } = require("pg");
const { createServer } = require("../demo_2027_postgres_server.js");
const PostgresRepository = require("../demo_2027_postgres_repository.js");

const ids = {
  org: "00000000-0000-4000-8000-000000000101",
  tournament: "00000000-0000-4000-8000-000000000102",
  secondTournament: "00000000-0000-4000-8000-000000000103",
  category: "00000000-0000-4000-8000-000000000104",
  secondCategory: "00000000-0000-4000-8000-000000000105",
  actor: "00000000-0000-4000-8000-000000000106",
  teams: ["00000000-0000-4000-8000-000000000111", "00000000-0000-4000-8000-000000000112", "00000000-0000-4000-8000-000000000113", "00000000-0000-4000-8000-000000000114"],
  matches: ["00000000-0000-4000-8000-000000000121", "00000000-0000-4000-8000-000000000122", "00000000-0000-4000-8000-000000000123", "00000000-0000-4000-8000-000000000124", "00000000-0000-4000-8000-000000000125", "00000000-0000-4000-8000-000000000126"]
};

function pool() { return new Pool({ connectionString: process.env.DATABASE_URL }); }
async function start(repository) {
  const server = createServer({ repository });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}
async function stop(server) { await new Promise((resolve) => server.close(resolve)); }
async function call(base, route, method = "GET", payload) {
  const response = await fetch(`${base}${route}`, { method, headers: { "content-type": "application/json" }, body: payload === undefined ? undefined : JSON.stringify(payload) });
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.error || `HTTP ${response.status}`); error.status = response.status; throw error; }
  return data;
}
async function mustReject(action) { await assert.rejects(action); }

(async () => {
  const schema = await fs.readFile(path.join(__dirname, "..", "docs", "demo-2027-postgres-schema.sql"), "utf8");
  const setup = pool(); await setup.query(schema); await setup.end();
  let db = pool();
  let running = await start(new PostgresRepository(db));
  await call(running.base, "/health");
  await call(running.base, "/api/tournaments", "POST", { id: ids.tournament, organizationId: ids.org, name: "HTTP 2027", season: 2027 });
  await call(running.base, "/api/tournaments", "POST", { id: ids.secondTournament, organizationId: ids.org, name: "HTTP 2027 B", season: 2027 });
  await call(running.base, "/api/categories", "POST", { id: ids.category, tournamentId: ids.tournament, name: "Maxi +35 A" });
  await call(running.base, "/api/categories", "POST", { id: ids.secondCategory, tournamentId: ids.secondTournament, name: "Maxi +35 B" });
  for (const [index, id] of ids.teams.entries()) await call(running.base, "/api/teams", "POST", { id, categoryId: ids.category, name: `HTTP Equipo ${index + 1}` });
  const matches = [[0, 0, 1], [0, 2, 3], [1, 0, 2], [1, 1, 3], [2, 0, 3], [2, 1, 2]].map(([round, home, away], index) => ({ id: ids.matches[index], round, homeTeamId: ids.teams[home], awayTeamId: ids.teams[away] }));
  await call(running.base, "/api/fixtures", "POST", { categoryId: ids.category, actorId: ids.actor, matches });
  await call(running.base, `/api/matches/${ids.matches[0]}/schedule`, "POST", { actorId: ids.actor, scheduledAt: "2027-05-02T15:00:00Z", court: "HTTP 1" });
  const savedResult = await call(running.base, `/api/matches/${ids.matches[0]}/result`, "POST", { actorId: ids.actor, homeScore: 80, awayScore: 70 });
  assert.equal(savedResult.home_score, 80);
  assert.equal(savedResult.away_score, 70);
  assert.equal(savedResult.result_state, "played");
  await mustReject(() => call(running.base, `/api/matches/${ids.matches[0]}/result`, "POST", { actorId: ids.actor, homeScore: 81, awayScore: 71 }));
  await mustReject(() => call(running.base, `/api/matches/${ids.matches[0]}/schedule`, "POST", { actorId: ids.actor, scheduledAt: "2027-05-09T15:00:00Z", court: "HTTP 2" }));
  await mustReject(() => call(running.base, "/api/fixtures", "POST", { categoryId: ids.category, actorId: ids.actor, matches: [{ ...matches[1], id: ids.matches[0] }] }));
  await stop(running.server); await db.end();

  db = pool(); running = await start(new PostgresRepository(db));
  const recovered = await call(running.base, `/api/categories/${ids.category}`);
  assert.equal(recovered.matches.length, 6);
  assert.equal(recovered.matches.find((match) => match.id === ids.matches[0]).home_score, 80);
  assert.equal(recovered.matches.find((match) => match.id === ids.matches[0]).result_state, "played");
  assert.ok(recovered.history.some((entry) => entry.action === "fixture_saved"));
  assert.ok(recovered.history.some((entry) => entry.action === "schedule_updated"));
  assert.ok(recovered.history.some((entry) => entry.action === "result_saved"));
  const other = await call(running.base, `/api/categories/${ids.secondCategory}`);
  assert.equal(other.matches.length, 0, "un torneo no debe recuperar partidos de otro");
  await stop(running.server); await db.end();
  console.log("POSTGRES_HTTP_INTEGRATION_OK");
})().catch((error) => { console.error(error); process.exitCode = 1; });
