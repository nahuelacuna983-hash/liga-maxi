"use strict";

const http = require("node:http");
const { Pool } = require("pg");
const PostgresRepository = require("./demo_2027_postgres_repository.js");

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}
async function body(request) {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}
function createServer({ repository }) {
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://127.0.0.1");
      if (request.method === "GET" && url.pathname === "/health") return json(response, 200, { ok: true, persistence: "postgresql" });
      if (request.method === "POST" && url.pathname === "/api/tournaments") return json(response, 201, await repository.createTournament(await body(request)));
      if (request.method === "POST" && url.pathname === "/api/categories") return json(response, 201, await repository.createCategory(await body(request)));
      if (request.method === "POST" && url.pathname === "/api/teams") return json(response, 201, await repository.addTeam(await body(request)));
      if (request.method === "POST" && url.pathname === "/api/fixtures") { const input = await body(request); return json(response, 201, { saved: await repository.saveFixture(input.categoryId, input.matches, input.actorId) }); }
      if (request.method === "POST" && /^\/api\/matches\/[^/]+\/schedule$/.test(url.pathname)) { const input = await body(request); input.matchId = url.pathname.split("/")[3]; return json(response, 200, await repository.scheduleMatch(input)); }
      if (request.method === "POST" && /^\/api\/matches\/[^/]+\/result$/.test(url.pathname)) { const input = await body(request); input.matchId = url.pathname.split("/")[3]; return json(response, 200, await repository.saveResult(input)); }
      if (request.method === "GET" && /^\/api\/categories\/[^/]+$/.test(url.pathname)) return json(response, 200, await repository.readCategory(url.pathname.split("/")[3]));
      return json(response, 404, { error: "Ruta no encontrada" });
    } catch (error) { return json(response, 400, { error: error.message, code: error.code || "PERSISTENCE_ERROR" }); }
  });
}

if (require.main === module) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const server = createServer({ repository: new PostgresRepository(pool) });
  const port = Number(process.env.PORT || 8787);
  server.listen(port, "127.0.0.1", () => console.log(`Liga Maxi PostgreSQL local: http://127.0.0.1:${port}`));
  const close = async () => { server.close(); await pool.end(); };
  process.once("SIGINT", close); process.once("SIGTERM", close);
}

module.exports = { createServer };
