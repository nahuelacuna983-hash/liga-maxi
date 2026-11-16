"use strict";

const assert = require("node:assert/strict");
const readline = require("node:readline");
const http = require("node:http");

const PROJECT = "wffvmthdmmjwspnozyrv";
const CATEGORY_ID = "a7000000-0000-4000-8000-000000000003";
const ASSOCIATION_EMAIL = "sociacion@apdb-test.invalid";
const DELEGATE_EMAIL = "delegado@apdb-test.invalid";

function readLocalBootstrap() {
  return new Promise((resolve, reject) => {
    const request = http.get("http://127.0.0.1:8790/index_online.html", (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => {
        const url = body.match(/window\.APDB_SUPABASE_URL=\"([^\"]+)/)?.[1];
        const key = body.match(/window\.APDB_SUPABASE_ANON_KEY=\"([^\"]+)/)?.[1];
        if (!url || !key) return reject(new Error("No se encontró configuración staging en 127.0.0.1:8790"));
        resolve({ url: url.replace(/\/$/, ""), key });
      });
    });
    request.on("error", () => reject(new Error("Iniciá el servidor local staging en 127.0.0.1:8790 antes de ejecutar la prueba")));
  });
}

function askHidden(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    stdout.write(question);
    let value = "";
    const wasRaw = stdin.isRaw;
    if (stdin.setRawMode) stdin.setRawMode(true);
    stdin.resume();
    const onData = (chunk) => {
      const text = chunk.toString("utf8");
      for (const char of text) {
        if (char === "\u0003") process.exitCode = 130;
        else if (char === "\r" || char === "\n") {
          stdin.removeListener("data", onData);
          if (stdin.setRawMode) stdin.setRawMode(Boolean(wasRaw));
          stdout.write("\n");
          resolve(value);
          return;
        } else if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else value += char;
      }
    };
    stdin.on("data", onData);
  });
}

async function request(base, path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch { body = text; }
  return { response, body };
}

function headers(key, token) {
  return {
    apikey: key,
    Authorization: token ? `Bearer ${token}` : `Bearer ${key}`,
    "content-type": "application/json"
  };
}

async function login(base, key, email, password) {
  const result = await request(base, "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: key, "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  assert.equal(result.response.status, 200, `Login fallido para ${email}: HTTP ${result.response.status}`);
  assert.ok(result.body.access_token, `Auth no devolvió sesión para ${email}`);
  return result.body.access_token;
}

async function main() {
  assert.equal(new URL(process.env.APDB_STAGING_URL || "https://wffvmthdmmjwspnozyrv.supabase.co").hostname, `${PROJECT}.supabase.co`, "La prueba sólo acepta APdB staging");
  const config = process.env.APDB_STAGING_ANON_KEY
    ? { url: process.env.APDB_STAGING_URL || `https://${PROJECT}.supabase.co`, key: process.env.APDB_STAGING_ANON_KEY }
    : await readLocalBootstrap();
  assert.equal(new URL(config.url).hostname, `${PROJECT}.supabase.co`, "Destino Supabase no autorizado");

  let associationPassword = await askHidden("Contraseña de sociacion@apdb-test.invalid: ");
  let delegatePassword = await askHidden("Contraseña de delegado@apdb-test.invalid: ");
  let associationToken;
  let delegateToken;
  try {
    associationToken = await login(config.url, config.key, ASSOCIATION_EMAIL, associationPassword);
    delegateToken = await login(config.url, config.key, DELEGATE_EMAIL, delegatePassword);
  } finally {
    associationPassword = null;
    delegatePassword = null;
  }

  const publicHeaders = headers(config.key);
  const associationHeaders = headers(config.key, associationToken);
  const delegateHeaders = headers(config.key, delegateToken);
  const category = await request(config.url, `/rest/v1/categorias?id=eq.${CATEGORY_ID}&select=id,nombre,torneo_id`, { headers: publicHeaders });
  assert.equal(category.response.status, 200, `Lectura de categoría fallida: HTTP ${category.response.status}`);
  const matches = await request(config.url, `/rest/v1/partidos?categoria_id=eq.${CATEGORY_ID}&select=id,local,visitante&order=created_at.asc&limit=1`, { headers: publicHeaders });
  assert.equal(matches.response.status, 200, `Lectura de partidos fallida: HTTP ${matches.response.status}`);
  const matchId = matches.body[0]?.id;
  assert.ok(matchId, "No se encontró partido sintético de staging");

  const beforeSchedules = await request(config.url, `/rest/v1/match_schedules?partido_id=eq.${matchId}&select=*`, { headers: publicHeaders });
  assert.equal(beforeSchedules.response.status, 200, `Lectura de programación fallida: HTTP ${beforeSchedules.response.status}`);

  const deniedAssociationOperation = await request(config.url, "/rest/v1/rpc/apdb_upsert_playoff_match", {
    method: "POST", headers: delegateHeaders,
    body: JSON.stringify({ p_payload: { categoria_id: CATEGORY_ID, fase: "final", llave: "certified-top4", titulo: "No autorizado", orden: 999, partido_numero: 99, local: "No autorizado", visitante: "No autorizado", estado: "pendiente" } })
  });
  assert.notEqual(deniedAssociationOperation.response.status, 200, "El delegado pudo ejecutar una RPC reservada a Asociación");

  const deniedSchedule = await request(config.url, "/rest/v1/rpc/apdb_upsert_match_schedule", {
    method: "POST", headers: delegateHeaders,
    body: JSON.stringify({ p_payload: { partido_id: matchId, categoria_id: CATEGORY_ID, fecha_partido: "2099-01-01", hora: "00:00", cancha: "No autorizado", estado: "listo" } })
  });
  assert.notEqual(deniedSchedule.response.status, 200, "El delegado pudo modificar programación");

  const directResult = await request(config.url, `/rest/v1/partidos?id=eq.${matchId}`, {
    method: "PATCH", headers: { ...delegateHeaders, Prefer: "return=representation" },
    body: JSON.stringify({ puntos_local: 999, puntos_visitante: 1 })
  });
  assert.notEqual(directResult.response.status, 200, "El delegado pudo escribir resultados por REST directo");

  const otherTeamDocs = await request(config.url, "/rest/v1/team_documents?select=id&limit=1", { headers: delegateHeaders });
  assert.notEqual(otherTeamDocs.response.status, 200, "El delegado accedió a documentos privados sin alcance comprobado");

  const afterSchedules = await request(config.url, `/rest/v1/match_schedules?partido_id=eq.${matchId}&select=*`, { headers: publicHeaders });
  assert.deepEqual(afterSchedules.body, beforeSchedules.body, "Una operación denegada modificó la programación");
  const preservedPlayoff = await request(config.url, `/rest/v1/playoff_matches?categoria_id=eq.${CATEGORY_ID}&select=fase,llave,local,visitante,puntos_local,puntos_visitante&order=orden,partido_numero`, { headers: publicHeaders });
  assert.equal(preservedPlayoff.response.status, 200, "No se pudo verificar la llave certificada");
  assert.equal(preservedPlayoff.body.length, 3, "La llave certificada dejó de tener tres partidos");
  console.log("APDB_STAGING_AUTH_PERMISSIONS_NEGATIVE_OK");
  console.log("Asociación y Delegado autenticados; operaciones denegadas sin cambios sobre fixture, resultados ni Top 4.");
}

main().catch((error) => { console.error(`APDB_STAGING_AUTH_PERMISSIONS_FAILED ${error.message}`); process.exitCode = 1; });
