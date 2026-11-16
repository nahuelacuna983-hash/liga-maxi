"use strict";

const assert = require("node:assert/strict");
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

function succeeded(result) {
  return result.response.status >= 200 && result.response.status < 300;
}

function canonical(value) {
  return JSON.stringify(value, (_, item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    return Object.keys(item).sort().reduce((out, key) => { out[key] = item[key]; return out; }, {});
  });
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

  try {
  const publicHeaders = headers(config.key);
  const associationHeaders = headers(config.key, associationToken);
  const delegateHeaders = headers(config.key, delegateToken);
  const pendientes = [];
  const category = await request(config.url, `/rest/v1/categorias?id=eq.${CATEGORY_ID}&select=id,nombre,torneo_id`, { headers: publicHeaders });
  assert.equal(category.response.status, 200, `Lectura de categoría fallida: HTTP ${category.response.status}`);
  assert.equal(category.body.length, 1, "No se encontró la categoría sintética esperada");

  const beforeMatches = await request(config.url, `/rest/v1/partidos?categoria_id=eq.${CATEGORY_ID}&select=*&order=created_at.asc`, { headers: publicHeaders });
  const beforeSchedules = await request(config.url, `/rest/v1/match_schedules?categoria_id=eq.${CATEGORY_ID}&select=*&order=created_at.asc`, { headers: publicHeaders });
  const beforePlayoffs = await request(config.url, `/rest/v1/playoff_matches?categoria_id=eq.${CATEGORY_ID}&select=*&order=orden,partido_numero`, { headers: publicHeaders });
  for (const [name, result] of [["partidos", beforeMatches], ["programación", beforeSchedules], ["playoffs", beforePlayoffs]]) {
    assert.equal(result.response.status, 200, `No se pudo leer ${name}: HTTP ${result.response.status}`);
  }
  assert.equal(beforePlayoffs.body.length, 3, "La llave Top 4 certificada no tiene tres partidos");
  const matchId = beforeMatches.body[0]?.id;
  assert.ok(matchId, "No se encontró partido sintético de staging");

  const existingSchedule = beforeSchedules.body[0];
  if (existingSchedule) {
    const allowedAssociation = await request(config.url, "/rest/v1/rpc/apdb_upsert_match_schedule", {
      method: "POST", headers: associationHeaders, body: JSON.stringify({ p_payload: existingSchedule })
    });
    assert.ok(succeeded(allowedAssociation), `Asociación no pudo conservar la programación: HTTP ${allowedAssociation.response.status}`);
  } else {
    pendientes.push("No se pudo probar una escritura positiva de Asociación: no existe una programación previa segura para reescribir idénticamente.");
  }

  const deniedPlayoff = await request(config.url, "/rest/v1/rpc/apdb_upsert_playoff_match", {
    method: "POST", headers: delegateHeaders,
    body: JSON.stringify({ p_payload: { categoria_id: CATEGORY_ID, fase: "final", llave: "certified-top4", titulo: "No autorizado", orden: 999, partido_numero: 99, local: "No autorizado", visitante: "No autorizado", estado: "pendiente" } })
  });
  assert.ok(!succeeded(deniedPlayoff), `El Delegado pudo ejecutar una RPC reservada a Asociación: HTTP ${deniedPlayoff.response.status}`);

  const deniedSchedule = await request(config.url, "/rest/v1/rpc/apdb_upsert_match_schedule", {
    method: "POST", headers: delegateHeaders,
    body: JSON.stringify({ p_payload: { partido_id: matchId, categoria_id: CATEGORY_ID, fecha_partido: "2099-01-01", hora: "00:00", cancha: "No autorizado", estado: "listo" } })
  });
  assert.ok(!succeeded(deniedSchedule), `El Delegado pudo modificar programación: HTTP ${deniedSchedule.response.status}`);

  const directResult = await request(config.url, `/rest/v1/partidos?id=eq.${matchId}`, {
    method: "PATCH", headers: { ...delegateHeaders, Prefer: "return=representation" },
    body: JSON.stringify({ puntos_local: 999, puntos_visitante: 1 })
  });
  assert.ok(!succeeded(directResult), `El Delegado pudo escribir resultados por REST directo: HTTP ${directResult.response.status}`);

  const documents = await request(config.url, "/rest/v1/team_documents?select=id&limit=1", { headers: delegateHeaders });
  if (succeeded(documents)) {
    pendientes.push("El aislamiento documental requiere filas sintéticas de equipos con y sin alcance; una respuesta 2xx vacía no se consideró aprobación.");
  }

  const afterMatches = await request(config.url, `/rest/v1/partidos?categoria_id=eq.${CATEGORY_ID}&select=*&order=created_at.asc`, { headers: publicHeaders });
  const afterSchedules = await request(config.url, `/rest/v1/match_schedules?categoria_id=eq.${CATEGORY_ID}&select=*&order=created_at.asc`, { headers: publicHeaders });
  const afterPlayoffs = await request(config.url, `/rest/v1/playoff_matches?categoria_id=eq.${CATEGORY_ID}&select=*&order=orden,partido_numero`, { headers: publicHeaders });
  assert.equal(canonical(afterMatches.body), canonical(beforeMatches.body), "Una operación denegada modificó resultados regulares");
  assert.equal(canonical(afterSchedules.body), canonical(beforeSchedules.body), "Una operación denegada modificó programación");
  assert.equal(canonical(afterPlayoffs.body), canonical(beforePlayoffs.body), "Una operación denegada modificó la llave Top 4");

  if (pendientes.length) {
    console.log("APDB_STAGING_AUTH_PERMISSIONS_PARTIAL_OK");
  } else {
    console.log("APDB_STAGING_AUTH_PERMISSIONS_OK");
  }
  if (pendientes.length) {
    console.log("PENDIENTES:");
    pendientes.forEach((item) => console.log(`- ${item}`));
    process.exitCode = 2;
  }
  } finally {
    associationToken = null;
    delegateToken = null;
  }
}

main().catch((error) => { console.error(`APDB_STAGING_AUTH_PERMISSIONS_FAILED ${error.message}`); process.exitCode = 1; });
