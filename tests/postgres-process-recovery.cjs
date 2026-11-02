"use strict";

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");
const { Pool } = require("pg");
const { createDevelopmentAuth } = require("../demo_2027_auth.js");

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ids = { org: id(101), user: id(201), tournament: id(603), category: id(604), teams: [id(605), id(606), id(607), id(608)], match: id(609) };
const dbUrl = process.env.DATABASE_URL;
const port = Number(process.env.POSTGRES_RECOVERY_PORT || 8897);
const base = `http://127.0.0.1:${port}`;
const timeoutMs = Number(process.env.POSTGRES_RECOVERY_TIMEOUT_MS || 120000);
const requestTimeoutMs = 10000;
const authSecret = process.env.LM_DEMO_AUTH_SECRET || "recovery-development-secret";
let serverSeed;
let serverRecovered;
let db;

function stage(message) { console.log(`[recovery] ${message}`); }
async function fetchJson(route, method = "GET", payload, token, timeout = requestTimeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${base}${route}`, { method, signal: controller.signal, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: payload === undefined ? undefined : JSON.stringify(payload) });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    if (!response.ok) throw new Error(`${method} ${route} HTTP ${response.status}: ${data?.error || JSON.stringify(data)}`);
    return data;
  } finally { clearTimeout(timer); }
}
function startServer() {
  const child = spawn(process.execPath, [path.join(__dirname, "..", "demo_2027_postgres_server.js")], { env: { ...process.env, DATABASE_URL: dbUrl, PORT: String(port), NODE_ENV: "development", LM_REQUIRE_AUTH: "1", LM_DEMO_AUTH_SECRET: authSecret }, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", (chunk) => { const line = String(chunk).trim(); if (line) stage(`server: ${line}`); });
  child.stderr.on("data", (chunk) => { const line = String(chunk).trim(); if (line) stage(`server-error: ${line}`); });
  return child;
}
function waitForExit(child, timeout = 10000) {
  if (!child || child.exitCode !== null) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`El proceso ${child.pid} no terminó dentro de ${timeout}ms.`)), timeout);
    child.once("exit", () => { clearTimeout(timer); resolve(); });
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
  });
}
async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  stage(`deteniendo proceso pid=${child.pid}`);
  child.kill("SIGTERM");
  try { await waitForExit(child); } catch (error) {
    stage(`terminación normal agotada: ${error.message}`);
    if (process.platform === "win32") spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
    else child.kill("SIGKILL");
    await waitForExit(child, 5000);
  }
  stage(`proceso detenido pid=${child.pid}`);
}
async function waitForServer() {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    try { await fetchJson("/health", "GET", undefined, undefined, 1000); stage("backend disponible"); return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("El backend no inició dentro de 15000ms.");
}

async function run() {
  if (!dbUrl) throw new Error("DATABASE_URL es obligatorio para la recuperación PostgreSQL.");
  const deadline = new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error(`La prueba superó ${timeoutMs}ms.`)), timeoutMs); timer.unref(); });
  const work = (async () => {
    db = new Pool({ connectionString: dbUrl });
    stage("aplicando esquema y preparando organización/membresía sintéticas");
    await db.query(await fs.readFile(path.join(__dirname, "..", "docs", "demo-2027-postgres-schema.sql"), "utf8"));
    await db.query("insert into lm_demo_organizations(id,name) values($1,'Recovery autenticada') on conflict (id) do nothing", [ids.org]);
    await db.query("insert into lm_demo_users(id,username,role) values($1,'dev-organizer','organizer') on conflict (id) do nothing", [ids.user]);
    await db.query("insert into lm_demo_memberships(user_id,organization_id) values($1,$2) on conflict do nothing", [ids.user, ids.org]);
    const persistedUser = (await db.query("select id,role from lm_demo_users where id=$1", [ids.user])).rows[0];
    const persistedMembership = (await db.query("select user_id,organization_id from lm_demo_memberships where user_id=$1 and organization_id=$2", [ids.user, ids.org])).rows[0];
    assert.deepEqual(persistedUser, { id: ids.user, role: "organizer" }, "el usuario de recuperación debe tener UUID y rol esperados");
    assert.deepEqual(persistedMembership, { user_id: ids.user, organization_id: ids.org }, "la membresía de recuperación debe existir antes del login");

    stage("iniciando primer proceso HTTP"); serverSeed = startServer(); await waitForServer();
    const login = await fetchJson("/api/auth/dev-login", "POST", { userId: "dev-organizer" });
    const token = login.token; assert.ok(token, "el login debe emitir token");
    const verifier = createDevelopmentAuth({ secret: authSecret, users: { [ids.user]: { id: ids.user, role: "organizer", organizationId: ids.org } } });
    const claims = verifier.verify(token);
    assert.deepEqual({ sub: claims.sub, role: claims.role, organizationId: claims.organizationId }, { sub: ids.user, role: "organizer", organizationId: ids.org }, "el token debe identificar al organizador esperado");
    stage("sesión inicial emitida con identidad y organización verificadas");
    const tournament = await fetchJson("/api/tournaments", "POST", { id: ids.tournament, organizationId: ids.org, name: "Recovery autenticada", season: 2027 }, token);
    assert.equal(tournament.organization_id, ids.org); stage("torneo persistido con organización derivada de sesión");
    const category = await fetchJson("/api/categories", "POST", { id: ids.category, tournamentId: tournament.id, name: "Maxi Recovery" }, token);
    for (const [index, teamId] of ids.teams.entries()) await fetchJson("/api/teams", "POST", { id: teamId, categoryId: category.id, name: `Recovery ${index + 1}` }, token);
    await fetchJson("/api/fixtures", "POST", { categoryId: category.id, matches: [{ id: ids.match, round: 0, homeTeamId: ids.teams[0], awayTeamId: ids.teams[1] }] }, token);
    await fetchJson(`/api/matches/${ids.match}/result`, "POST", { homeScore: 80, awayScore: 70 }, token);
    const playoff = { formato: "top4", estado: "finalizado", champion: "Recovery 1", matches: [{ ronda: "final", local: "Recovery 1", visitante: "Recovery 2", puntos_local: 80, puntos_visitante: 70 }] };
    await fetchJson("/api/playoffs", "POST", { categoryId: category.id, format: "top4", state: "finalizado", champion: "Recovery 1", payload: playoff }, token);
    const before = { category: await fetchJson(`/api/categories/${category.id}`, "GET", undefined, token), playoffs: await fetchJson(`/api/categories/${category.id}/playoffs`, "GET", undefined, token) };
    assert.equal(before.category.matches[0].home_score, 80); assert.equal(before.playoffs.playoff.champion, "Recovery 1"); assert.ok(before.category.history.length >= 2); assert.ok(before.playoffs.history.length >= 1); stage("campeonato, resultado, playoff, campeón e historial capturados");

    await stopServer(serverSeed); serverSeed = null;
    stage("iniciando segundo proceso HTTP sobre la misma base"); serverRecovered = startServer(); await waitForServer();
    const newLogin = await fetchJson("/api/auth/dev-login", "POST", { userId: "dev-organizer" });
    const after = { category: await fetchJson(`/api/categories/${category.id}`, "GET", undefined, newLogin.token), playoffs: await fetchJson(`/api/categories/${category.id}/playoffs`, "GET", undefined, newLogin.token) };
    assert.deepEqual(after.category.matches, before.category.matches); assert.deepEqual(after.category.history, before.category.history); assert.deepEqual(after.playoffs.playoff.payload, before.playoffs.playoff.payload); assert.equal(after.playoffs.playoff.champion, "Recovery 1"); assert.ok(after.playoffs.history.length >= 1); stage("estado recuperado sin duplicados");
    await stopServer(serverRecovered); serverRecovered = null; stage("segundo proceso detenido correctamente");
  })();
  await Promise.race([work, deadline]);
}

(async () => {
  try { await run(); console.log("POSTGRES_PROCESS_RECOVERY_OK"); }
  catch (error) { console.error(`[recovery] ERROR: ${error.stack || error.message}`); process.exitCode = 1; }
  finally {
    try { await stopServer(serverSeed); } catch (error) { console.error(`[recovery] cleanup seed: ${error.message}`); process.exitCode = 1; }
    try { await stopServer(serverRecovered); } catch (error) { console.error(`[recovery] cleanup recovered: ${error.message}`); process.exitCode = 1; }
    if (db) { try { await db.end(); } catch (error) { console.error(`[recovery] cleanup db: ${error.message}`); process.exitCode = 1; } }
  }
})();
