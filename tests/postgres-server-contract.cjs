"use strict";

const assert = require("node:assert/strict");
const { createServer } = require("../demo_2027_postgres_server.js");

const repository = {
  createTournament: async (input) => ({ id: input.id, name: input.name }),
  createCategory: async (input) => ({ id: input.id, tournament_id: input.tournamentId }),
  addTeam: async (input) => ({ id: input.id, category_id: input.categoryId }),
  saveFixture: async (categoryId, matches) => matches.length,
  scheduleMatch: async (input) => input,
  saveResult: async (input) => input,
  readCategory: async (id) => ({ category: { id }, matches: [], history: [] })
};

function request(base, path, method = "GET", payload) {
  return fetch(`${base}${path}`, { method, headers: { "content-type": "application/json" }, body: payload ? JSON.stringify(payload) : undefined });
}

(async () => {
  const server = createServer({ repository, staticRoot: require("node:path").join(__dirname, "..") });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const health = await request(base, "/health");
  assert.deepEqual(await health.json(), { ok: true, persistence: "postgresql" });
  const page = await request(base, "/demo_persistencia_2027.html");
  assert.match(await page.text(), /PERSISTENCIA LOCAL/);
  const fixture = await request(base, "/api/fixtures", "POST", { categoryId: "cat", actorId: "actor", matches: [{ id: "m1" }] });
  assert.equal((await fixture.json()).saved, 1);
  const category = await request(base, "/api/categories/cat");
  assert.equal((await category.json()).category.id, "cat");
  await new Promise((resolve) => server.close(resolve));
  console.log("POSTGRES_SERVER_CONTRACT_OK");
})().catch((error) => { console.error(error); process.exitCode = 1; });
