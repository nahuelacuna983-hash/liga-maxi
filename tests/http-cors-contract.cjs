"use strict";
const assert = require("node:assert/strict");
const { createServer } = require("../demo_2027_postgres_server.js");
const repository = { pool: { query: async () => ({ rows: [] }) }, readTournaments: async () => [] };
(async () => {
  const server = createServer({ repository });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const allowed = await fetch(`${base}/health`, { headers: { origin: "http://127.0.0.1:4173" } });
    assert.equal(allowed.headers.get("access-control-allow-origin"), "http://127.0.0.1:4173");
    const preflight = await fetch(`${base}/api/tournaments`, { method: "OPTIONS", headers: { origin: "http://127.0.0.1:4173", "access-control-request-method": "POST" } });
    assert.equal(preflight.status, 204);
    const denied = await fetch(`${base}/health`, { headers: { origin: "http://evil.invalid" } });
    assert.equal(denied.headers.get("access-control-allow-origin"), null);
    console.log("HTTP_CORS_CONTRACT_OK");
  } finally { await new Promise((resolve) => server.close(resolve)); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
