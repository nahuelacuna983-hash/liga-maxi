"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");
const PostgresRepository = require("./demo_2027_postgres_repository.js");
const sports = require("./demo_2027_sports.js");

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}
async function body(request) {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}
function createServer({ repository, staticRoot = null }) {
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://127.0.0.1");
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
      if (request.method === "GET" && url.pathname === "/api/tournaments") return json(response, 200, await repository.readTournaments());
      if (request.method === "POST" && url.pathname === "/api/tournaments") return json(response, 201, await repository.createTournament(await body(request)));
      if (request.method === "POST" && url.pathname === "/api/categories") return json(response, 201, await repository.createCategory(await body(request)));
      if (request.method === "GET" && /^\/api\/tournaments\/[^/]+\/categories$/.test(url.pathname)) return json(response, 200, await repository.readCategories(url.pathname.split("/")[3]));
      if (request.method === "POST" && url.pathname === "/api/teams") return json(response, 201, await repository.addTeam(await body(request)));
      if (request.method === "POST" && url.pathname === "/api/fixtures") { const input = await body(request); return json(response, 201, { saved: await repository.saveFixture(input.categoryId, input.matches, input.actorId) }); }
      if (request.method === "POST" && /^\/api\/matches\/[^/]+\/schedule$/.test(url.pathname)) { const input = await body(request); input.matchId = url.pathname.split("/")[3]; return json(response, 200, await repository.scheduleMatch(input)); }
      if (request.method === "POST" && /^\/api\/matches\/[^/]+\/result$/.test(url.pathname)) { const input = await body(request); input.matchId = url.pathname.split("/")[3]; return json(response, 200, await repository.saveResult(input)); }
      if (request.method === "GET" && /^\/api\/categories\/[^/]+$/.test(url.pathname)) return json(response, 200, await repository.readCategory(url.pathname.split("/")[3]));
      if (request.method === "GET" && /^\/api\/categories\/[^/]+\/competition$/.test(url.pathname)) {
        const state = await repository.readCategory(url.pathname.split("/")[3]);
        const names = new Map(state.teams.map((team) => [team.id, team.name]));
        const matches = state.matches.map((match) => ({ ...match, local: names.get(match.home_team_id), visitante: names.get(match.away_team_id), puntos_local: match.home_score, puntos_visitante: match.away_score, estado_resultado: match.result_state }));
        return json(response, 200, { ...state, matches, table: sports.calcularTabla(matches) });
      }
      return json(response, 404, { error: "Ruta no encontrada" });
    } catch (error) { return json(response, 400, { error: error.message, code: error.code || "PERSISTENCE_ERROR" }); }
  });
}

if (require.main === module) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const server = createServer({ repository: new PostgresRepository(pool), staticRoot: process.cwd() });
  const port = Number(process.env.PORT || 8787);
  server.listen(port, "127.0.0.1", () => console.log(`Liga Maxi PostgreSQL local: http://127.0.0.1:${port}`));
  const close = async () => { server.close(); await pool.end(); };
  process.once("SIGINT", close); process.once("SIGTERM", close);
}

module.exports = { createServer };
