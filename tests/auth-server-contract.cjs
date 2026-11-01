"use strict";

const assert = require("node:assert/strict");
const { createDevelopmentAuth } = require("../demo_2027_auth.js");
const { createServer } = require("../demo_2027_postgres_server.js");

const calls = [];
const repository = {
  createTournament: async (input) => { calls.push(input); return input; },
  createCategory: async (input) => input,
  addTeam: async (input) => input,
  saveFixture: async (categoryId, matches, actorId) => { calls.push({ categoryId, matches, actorId }); return matches.length; },
  savePlayoffs: async (input) => input,
  scheduleMatch: async (input) => input,
  saveResult: async (input) => input,
  readTournaments: async () => [],
  readCategories: async () => [],
  readCategory: async (id) => ({ category: { id }, teams: [], matches: [], history: [] }),
  readPlayoffs: async () => ({ playoff: null, history: [] })
};
const auth = createDevelopmentAuth({ secret: "synthetic-development-secret", users: { organizer: { id: "organizer", role: "organizer", organizationId: "org-a" }, delegate: { id: "delegate", role: "delegate", organizationId: "org-a" } } });
const request = (base, route, method = "GET", payload, token) => fetch(`${base}${route}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: payload === undefined ? undefined : JSON.stringify(payload) });

(async () => {
  const server = createServer({ repository, auth, requireAuth: true });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const anonymous = await request(base, "/api/tournaments", "POST", { id: "t", organizationId: "attacker", name: "x", season: 2027 });
  assert.equal(anonymous.status, 400);
  const login = await request(base, "/api/auth/dev-login", "POST", { userId: "organizer" });
  const { token } = await login.json();
  const created = await request(base, "/api/tournaments", "POST", { id: "t", organizationId: "attacker", name: "x", season: 2027 }, token);
  assert.equal(created.status, 201);
  assert.equal(calls[0].organizationId, "org-a");
  const fixture = await request(base, "/api/fixtures", "POST", { categoryId: "c", actorId: "attacker", matches: [] }, token);
  assert.equal(fixture.status, 201);
  assert.equal(calls[1].actorId, "organizer");
  await new Promise((resolve) => server.close(resolve));
  console.log("AUTH_SERVER_CONTRACT_OK");
})().catch((error) => { console.error(error); process.exitCode = 1; });
