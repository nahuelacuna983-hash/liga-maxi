"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");
const PostgresRepository = require("./demo_2027_postgres_repository.js");
const sports = require("./demo_2027_sports.js");
const { createDevelopmentAuth } = require("./demo_2027_auth.js");

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}
async function body(request) {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}
function createServer({ repository, staticRoot = null, auth = null, requireAuth = false }) {
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://127.0.0.1");
      const authenticate = () => {
        if (!requireAuth) return null;
        const header = request.headers.authorization || "";
        if (!header.startsWith("Bearer ")) throw new Error("Autenticación requerida.");
        return auth.verify(header.slice("Bearer ".length));
      };
      if (request.method === "GET" && staticRoot && ["/", "/demo_persistencia_2027.html", "/demo_circuito_2027.html", "/demo_2027_http_client.js", "/demo_circuito_2027_persistent.js", "/demo_2027_fixture.js", "/demo_2027_sports.js", "/demo_2027_provider.js", "/demo_circuito_2027.js", "/style.css"].includes(url.pathname)) {
        const file = url.pathname === "/" ? "demo_persistencia_2027.html" : url.pathname.slice(1);
        const target = path.resolve(staticRoot, file);
        if (!target.startsWith(path.resolve(staticRoot) + path.sep)) return json(response, 400, { error: "Ruta estática inválida" });
        if (!fs.existsSync(target)) return json(response, 404, { error: "Recurso no encontrado" });
        const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
        response.writeHead(200, { "content-type": types[path.extname(target)] || "application/octet-stream" });
        return response.end(fs.readFileSync(target));
      }
      if (request.method === "GET" && url.pathname === "/health") return json(response, 200, { ok: true, persistence: "postgresql" });
      if (request.method === "POST" && url.pathname === "/api/auth/dev-login") {
        if (!auth) throw new Error("Autenticación de desarrollo no configurada.");
        const input = await body(request);
        return json(response, 200, { token: auth.issue(input.userId) });
      }
      if (request.method === "GET" && url.pathname === "/api/tournaments") { const actor = authenticate(); return json(response, 200, actor && repository.readTournamentsForActor ? await repository.readTournamentsForActor(actor) : await repository.readTournaments()); }
      if (request.method === "POST" && url.pathname === "/api/tournaments") { const actor = authenticate(); const input = await body(request); if (actor) input.organizationId = actor.organizationId; if (actor && !["platform_admin", "organizer"].includes(actor.role)) throw new Error("Rol no autorizado."); return json(response, 201, await repository.createTournament(input)); }
      if (request.method === "POST" && url.pathname === "/api/categories") { const actor = authenticate(); const input = await body(request); if (actor && !["platform_admin", "organizer"].includes(actor.role)) throw new Error("Rol no autorizado."); if (actor && repository.assertTournamentAccess) await repository.assertTournamentAccess(input.tournamentId, actor); return json(response, 201, await repository.createCategory(input)); }
      if (request.method === "GET" && /^\/api\/tournaments\/[^/]+\/categories$/.test(url.pathname)) { const actor = authenticate(); return json(response, 200, actor && repository.readCategoriesForActor ? await repository.readCategoriesForActor(url.pathname.split("/")[3], actor) : await repository.readCategories(url.pathname.split("/")[3])); }
      if (request.method === "POST" && url.pathname === "/api/teams") { const actor = authenticate(); const input = await body(request); if (actor && !["platform_admin", "organizer"].includes(actor.role)) throw new Error("Rol no autorizado."); if (actor && repository.assertCategoryAccess) await repository.assertCategoryAccess(input.categoryId, actor); return json(response, 201, await repository.addTeam(input)); }
      if (request.method === "POST" && url.pathname === "/api/fixtures") { const actor = authenticate(); if (actor?.role === "delegate") throw new Error("Rol no autorizado para publicar fixtures."); const input = await body(request); if (actor && repository.assertCategoryAccess) await repository.assertCategoryAccess(input.categoryId, actor); if (actor) input.actorId = actor.sub; return json(response, 201, { saved: await repository.saveFixture(input.categoryId, input.matches, input.actorId) }); }
      if (request.method === "POST" && url.pathname === "/api/playoffs") { const actor = authenticate(); if (actor?.role === "delegate") throw new Error("Rol no autorizado para administrar playoffs."); const input = await body(request); if (actor && repository.assertCategoryAccess) await repository.assertCategoryAccess(input.categoryId, actor); if (actor) input.actorId = actor.sub; return json(response, 201, await repository.savePlayoffs(input)); }
      if (request.method === "POST" && /^\/api\/matches\/[^/]+\/schedule$/.test(url.pathname)) { const actor = authenticate(); const input = await body(request); input.matchId = url.pathname.split("/")[3]; if (actor && repository.assertMatchAccess) await repository.assertMatchAccess(input.matchId, actor); if (actor?.role === "delegate") throw new Error("Rol no autorizado para programar partidos."); if (actor) input.actorId = actor.sub; return json(response, 200, await repository.scheduleMatch(input)); }
      if (request.method === "POST" && /^\/api\/matches\/[^/]+\/result$/.test(url.pathname)) { const actor = authenticate(); const input = await body(request); input.matchId = url.pathname.split("/")[3]; if (actor?.role === "delegate") { if (requireAuth && repository.saveDelegateResult) return json(response, 200, await repository.saveDelegateResult({ ...input, actor })); if (requireAuth) throw new Error("El repositorio no ofrece autorización transaccional de delegado."); if (repository.assertDelegateResultAccess) await repository.assertDelegateResultAccess(input.matchId, actor); else { const match = await repository.readMatch(input.matchId); if (!match || !actor.categories.includes(match.category_id) || !actor.teams.includes(match.home_team_id) && !actor.teams.includes(match.away_team_id)) throw new Error("El delegado no tiene alcance sobre este partido."); } } if (actor) input.actorId = actor.sub; return json(response, 200, await repository.saveResult(input)); }
      if (request.method === "GET" && /^\/api\/categories\/[^/]+$/.test(url.pathname)) { const actor = authenticate(); if (actor && repository.assertCategoryAccess) await repository.assertCategoryAccess(url.pathname.split("/")[3], actor); return json(response, 200, await repository.readCategory(url.pathname.split("/")[3])); }
      if (request.method === "GET" && /^\/api\/categories\/[^/]+\/competition$/.test(url.pathname)) {
        const state = await repository.readCategory(url.pathname.split("/")[3]);
        const names = new Map(state.teams.map((team) => [team.id, team.name]));
        const matches = state.matches.map((match) => ({ ...match, local: names.get(match.home_team_id), visitante: names.get(match.away_team_id), puntos_local: match.home_score, puntos_visitante: match.away_score, estado_resultado: match.result_state }));
        return json(response, 200, { ...state, matches, table: sports.calcularTabla(matches) });
      }
      if (request.method === "GET" && /^\/api\/categories\/[^/]+\/playoffs$/.test(url.pathname)) { const actor = authenticate(); if (actor && repository.assertCategoryAccess) await repository.assertCategoryAccess(url.pathname.split("/")[3], actor); return json(response, 200, await repository.readPlayoffs(url.pathname.split("/")[3])); }
      if (request.method === "POST" && url.pathname === "/api/organizations") { const actor = authenticate(); return json(response, 201, await repository.createOrganization(await body(request), actor)); }
      if (request.method === "POST" && url.pathname === "/api/users") { const actor = authenticate(); return json(response, 201, await repository.createUser(await body(request), actor)); }
      if (request.method === "POST" && url.pathname === "/api/memberships") { const actor = authenticate(); return json(response, 200, await repository.setMembership(await body(request), actor)); }
      if (request.method === "DELETE" && url.pathname === "/api/memberships") { const actor = authenticate(); return json(response, 200, await repository.revokeMembership(await body(request), actor)); }
      if (request.method === "POST" && url.pathname === "/api/delegate-assignments") { const actor = authenticate(); return json(response, 200, await repository.setDelegateAssignment(await body(request), actor)); }
      if (request.method === "DELETE" && url.pathname === "/api/delegate-assignments") { const actor = authenticate(); return json(response, 200, await repository.revokeDelegateAssignment(await body(request), actor)); }
      return json(response, 404, { error: "Ruta no encontrada" });
    } catch (error) { return json(response, 400, { error: error.message, code: error.code || "PERSISTENCE_ERROR" }); }
  });
}

if (require.main === module) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const auth = process.env.NODE_ENV !== "production" && process.env.LM_REQUIRE_AUTH === "1" ? createDevelopmentAuth({ secret: process.env.LM_DEMO_AUTH_SECRET, users: { "dev-organizer": { id: "00000000-0000-4000-8000-000000000201", role: "organizer", organizationId: "00000000-0000-4000-8000-000000000101" }, "dev-admin": { id: "00000000-0000-4000-8000-000000000202", role: "platform_admin", organizationId: null }, "dev-delegate": { id: "00000000-0000-4000-8000-000000000203", role: "delegate", organizationId: "00000000-0000-4000-8000-000000000101" } } }) : null;
  const server = createServer({ repository: new PostgresRepository(pool), staticRoot: process.cwd(), auth, requireAuth: process.env.LM_REQUIRE_AUTH === "1" });
  const port = Number(process.env.PORT || 8787);
  server.listen(port, "127.0.0.1", () => console.log(`Liga Maxi PostgreSQL local: http://127.0.0.1:${port}`));
  const close = async () => { server.close(); await pool.end(); };
  process.once("SIGINT", close); process.once("SIGTERM", close);
}

module.exports = { createServer };
