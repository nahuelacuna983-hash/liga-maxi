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
  saveResult: async (input) => { calls.push(input); return input; },
  saveDelegateResult: async (input) => { calls.push({ matchId: input.matchId, actorId: input.actor.sub }); return { match_id: input.matchId }; },
  readMatch: async () => ({ category_id: "c", home_team_id: "team-a", away_team_id: "team-b" }),
  readTournaments: async () => [],
  readCategories: async () => [],
  readCategory: async (id) => ({ category: { id }, teams: [], matches: [], history: [] }),
  readPlayoffs: async () => ({ playoff: null, history: [] })
};
const auth = createDevelopmentAuth({ secret: "synthetic-development-secret", users: { "dev-organizer": { id: "00000000-0000-4000-8000-000000000201", role: "organizer", organizationId: "org-a" }, "dev-delegate": { id: "00000000-0000-4000-8000-000000000203", role: "delegate", organizationId: "org-a", categories: ["c"], teams: ["team-a"] }, "dev-admin": { id: "00000000-0000-4000-8000-000000000202", role: "platform_admin", organizationId: null } } });
const request = (base, route, method = "GET", payload, token) => fetch(`${base}${route}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: payload === undefined ? undefined : JSON.stringify(payload) });

(async () => {
  const server = createServer({ repository, auth, requireAuth: true });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const anonymous = await request(base, "/api/tournaments", "POST", { id: "t", organizationId: "attacker", name: "x", season: 2027 });
  assert.equal(anonymous.status, 400);
  const malformed = await request(base, "/api/tournaments", "GET", undefined, "malformed.token");
  assert.equal(malformed.status, 400);
  const login = await request(base, "/api/auth/dev-login", "POST", { userId: "dev-organizer" });
  const { token } = await login.json();
  const created = await request(base, "/api/tournaments", "POST", { id: "t", organizationId: "attacker", name: "x", season: 2027 }, token);
  assert.equal(created.status, 201);
  assert.equal(calls[0].organizationId, "org-a");
  assert.equal(auth.verify(token).sub, "00000000-0000-4000-8000-000000000201");
  const fixture = await request(base, "/api/fixtures", "POST", { categoryId: "c", actorId: "attacker", matches: [] }, token);
  assert.equal(fixture.status, 201);
  assert.equal(calls[1].actorId, "00000000-0000-4000-8000-000000000201");
  const delegateLogin = await request(base, "/api/auth/dev-login", "POST", { userId: "dev-delegate" });
  const delegateToken = (await delegateLogin.json()).token;
  assert.equal(auth.verify(delegateToken).role, "delegate");
  const forbidden = await request(base, "/api/fixtures", "POST", { categoryId: "c", actorId: "organizer", matches: [] }, delegateToken);
  assert.equal(forbidden.status, 400);
  const delegatedResult = await request(base, "/api/matches/m/result", "POST", { actorId: "attacker", homeScore: 80, awayScore: 70 }, delegateToken);
  assert.equal(delegatedResult.status, 200);
  assert.equal(calls.at(-1).actorId, "00000000-0000-4000-8000-000000000203");
  const adminLogin = await request(base, "/api/auth/dev-login", "POST", { userId: "dev-admin" });
  assert.equal(auth.verify((await adminLogin.json()).token).role, "platform_admin");
  const unknownLogin = await request(base, "/api/auth/dev-login", "POST", { userId: "unknown" });
  assert.equal(unknownLogin.status, 400);
  await new Promise((resolve) => server.close(resolve));
  console.log("AUTH_SERVER_CONTRACT_OK");
})().catch((error) => { console.error(error); process.exitCode = 1; });
