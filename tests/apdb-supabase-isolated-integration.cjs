"use strict";
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { Client } = require("pg");

for (const name of ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL"]) {
  assert.ok(process.env[name], `${name} is required in the isolated runner`);
}
assert.doesNotMatch(process.env.SUPABASE_URL, /supabase\.co$/i, "Refusing a hosted Supabase target");
const base = process.env.SUPABASE_URL.replace(/\/$/, "");
const run = crypto.randomUUID().slice(0, 8);
const password = `Aislamiento-${crypto.randomBytes(12).toString("hex")}!a1`;
const users = {
  association: { email: `association-${run}@example.invalid` },
  associationB: { email: `association-b-${run}@example.invalid` },
  delegateA: { email: `delegate-a-${run}@example.invalid` },
  delegateB: { email: `delegate-b-${run}@example.invalid` },
};
const orgA = "10000000-0000-0000-0000-000000000001";
const orgB = "10000000-0000-0000-0000-000000000002";
const categoryA = "30000000-0000-0000-0000-000000000001";
const matchA = crypto.randomUUID();
const matchConcurrent = crypto.randomUUID();

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const text = await response.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { response, body };
}
async function createAuthUser(email) {
  const result = await request("/auth/v1/admin/users", {
    method: "POST",
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  assert.equal(result.response.status, 200, `Auth user creation failed: ${result.response.status}`);
  return result.body.id;
}
async function login(email) {
  const result = await request("/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: process.env.SUPABASE_ANON_KEY, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(result.response.status, 200, `Auth login failed: ${result.response.status}`);
  return result.body.access_token;
}

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const ids = {};
    for (const [key, user] of Object.entries(users)) ids[key] = await createAuthUser(user.email);
    await client.query("insert into app_users (id, auth_user_id, organizacion_id, display_name, role) values ($1,$1,$2,'Asociacion test','asociacion'),($3,$3,$2,'Delegado A','delegado'),($4,$4,$5,'Delegado B','delegado'),($6,$6,$5,'Asociacion B test','asociacion')", [ids.association, orgA, ids.delegateA, ids.delegateB, orgB, ids.associationB]);
    await client.query("insert into app_user_permissions (user_id, organizacion_id, torneo_id, categoria_id, can_view, can_load_results) values ($1,$2,'20000000-0000-0000-0000-000000000001',$3,true,true)", [ids.delegateA, orgA, categoryA]);
    await client.query("insert into partidos (id, categoria_id, local, visitante) values ($1,$2,'Equipo sintético A','Equipo sintético A visitante')", [matchA, categoryA]);
    await client.query("insert into partidos (id, categoria_id, local, visitante) values ($1,$2,'Equipo sintético A','Equipo sintético A visitante')", [matchConcurrent, categoryA]);
    const delegateToken = await login(users.delegateA.email);
    const associationToken = await login(users.association.email);
    const callRpc = (token, payload) => request("/rest/v1/rpc/apdb_save_result", {
      method: "POST",
      headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const allowed = await callRpc(delegateToken, { p_match_id: matchA, p_home_score: 80, p_away_score: 70 });
    assert.equal(allowed.response.status, 200, `Authorized delegate rejected: ${allowed.response.status}`);

    const callAssociation = (payload) => request("/rest/v1/rpc/apdb_association_update_result", {
      method: "POST",
      headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${associationToken}`, "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const associationPayload = (state, home, away, action) => ({
      p_match_id: matchA, p_home_score: home, p_away_score: away,
      p_result_state: state, p_action: action,
    });
    let corrected = await callAssociation(associationPayload("jugado", 81, 70, "correccion"));
    assert.equal(corrected.response.status, 200, `Association correction rejected: ${corrected.response.status} ${JSON.stringify(corrected.body)}`);
    let tie = await callAssociation(associationPayload("jugado", 75, 75, "correccion"));
    assert.notEqual(tie.response.status, 200, "Association tie correction unexpectedly succeeded");
    let annulled = await callAssociation(associationPayload("pendiente", null, null, "anulacion"));
    assert.equal(annulled.response.status, 200, `Association annulment rejected: ${annulled.response.status}`);
    for (const [state, home, away] of [["administrativo_sin_puntos", 0, 0], ["resolucion_local", 20, 0], ["resolucion_visitante", 0, 20]]) {
      const resolved = await callAssociation(associationPayload(state, home, away, state));
      assert.equal(resolved.response.status, 200, `Association ${state} rejected: ${resolved.response.status} ${JSON.stringify(resolved.body)}`);
      const reset = await callAssociation(associationPayload("pendiente", null, null, "anulacion"));
      assert.equal(reset.response.status, 200, `Reset after ${state} rejected: ${reset.response.status}`);
    }
    const audit = await client.query("select accion, estado_resultado_nuevo from result_change_logs where partido_id = $1 order by created_at", [matchA]);
    assert(audit.rows.length >= 6, `Expected association audit history, got ${audit.rows.length}`);
    assert(audit.rows.some((row) => row.accion === "correccion"));
    assert(audit.rows.some((row) => row.estado_resultado_nuevo === "resolucion_local"));
    assert(audit.rows.some((row) => row.estado_resultado_nuevo === "resolucion_visitante"));

    const callAdminRpc = (name, payload) => request(`/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${associationToken}`, "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const schedule = await callAdminRpc("apdb_upsert_match_schedule", { p_payload: {
      partido_id: matchA, categoria_id: categoryA, categoria_nombre: "Categoria sintética A",
      fecha_partido: "2027-03-10", hora: "20:30", cancha: "Cancha sintética", estado: "enviado",
      observacion: "Programación de prueba"
    }});
    assert.equal(schedule.response.status, 200, `Association schedule RPC rejected: ${schedule.response.status} ${JSON.stringify(schedule.body)}`);
    const storedSchedule = await client.query("select fecha_partido, hora, cancha, estado from match_schedules where partido_id = $1", [matchA]);
    assert.equal(storedSchedule.rows[0]?.cancha, "Cancha sintética");
    assert.equal(storedSchedule.rows[0]?.estado, "enviado");

    const playoffPayload = { categoria_id: categoryA, categoria_nombre: "Categoria sintética A", fase: "semifinales",
      llave: `semi-${run}`, titulo: "Semifinal sintética", orden: 10, partido_numero: 1,
      fecha: "2027-03-20", local: "Equipo sintético A", visitante: "Equipo sintético B",
      puntos_local: null, puntos_visitante: null, estado: "pendiente" };
    const playoff = await callAdminRpc("apdb_upsert_playoff_match", { p_payload: playoffPayload });
    assert.equal(playoff.response.status, 200, `Association playoff RPC rejected: ${playoff.response.status} ${JSON.stringify(playoff.body)}`);
    const storedPlayoff = await client.query("select fase, llave, estado from playoff_matches where categoria_id = $1 and llave = $2", [categoryA, playoffPayload.llave]);
    assert.equal(storedPlayoff.rows.length, 1, "Playoff RPC did not persist its match");
    const delegateSchedule = await request("/rest/v1/rpc/apdb_upsert_match_schedule", {
      method: "POST", headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${delegateToken}`, "content-type": "application/json" },
      body: JSON.stringify({ p_payload: { ...schedule.body, categoria_id: categoryA, partido_id: matchA } })
    });
    assert.notEqual(delegateSchedule.response.status, 200, "Delegate unexpectedly scheduled a match");
    const directSchedule = await request(`/rest/v1/match_schedules?partido_id=eq.${matchA}`, {
      method: "PATCH", headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${delegateToken}`, "content-type": "application/json" },
      body: JSON.stringify({ cancha: "Cancha indebida" })
    });
    assert(!directSchedule.response.ok, "Direct schedule write unexpectedly succeeded");
    const directPlayoff = await request(`/rest/v1/playoff_matches?categoria_id=eq.${categoryA}&llave=eq.${playoffPayload.llave}`, {
      method: "PATCH", headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${delegateToken}`, "content-type": "application/json" },
      body: JSON.stringify({ observacion: "Cambio indebido" })
    });
    assert(!directPlayoff.response.ok, "Direct playoff write unexpectedly succeeded");

    const associationBToken = await login(users.associationB.email);
    const publish = (token, categoryId, matches) => request("/rest/v1/rpc/apdb_publish_fixture", {
      method: "POST", headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ p_categoria_id: categoryId, p_category_payload: { estado: "publicada", formato: "Top 4", playoffs: true, clasificados: 4, fechas_bloqueadas: ["2027-04-01"] }, p_matches: matches })
    });
    const fixturePayload = [
      { local: "Equipo B 1", visitante: "Equipo B 2", jornada: 1, fecha: "2027-04-01", libre: null },
      { local: "Equipo B 2", visitante: "Equipo B 1", jornada: 2, fecha: "2027-04-08", libre: null }
    ];
    const published = await publish(associationBToken, "30000000-0000-0000-0000-000000000002", fixturePayload);
    assert.equal(published.response.status, 200, `Fixture publication RPC rejected: ${published.response.status} ${JSON.stringify(published.body)}`);
    const publishedRows = await client.query("select count(*)::int as count from partidos where categoria_id = $1", ["30000000-0000-0000-0000-000000000002"]);
    assert.equal(publishedRows.rows[0].count, 2, "Fixture publication did not persist both matches");
    const publishedMatches = await client.query("select id, fecha from partidos where categoria_id = $1 order by jornada", ["30000000-0000-0000-0000-000000000002"]);
    const blockedSchedule = await request("/rest/v1/rpc/apdb_upsert_match_schedule", {
      method: "POST", headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${associationBToken}`, "content-type": "application/json" },
      body: JSON.stringify({ p_payload: { partido_id: publishedMatches.rows[0].id, categoria_id: "30000000-0000-0000-0000-000000000002", fecha_partido: "2027-04-01", hora: "20:00", cancha: "Cancha B", estado: "listo" } })
    });
    assert.notEqual(blockedSchedule.response.status, 200, "Blocked schedule date unexpectedly accepted");
    const batchSchedules = publishedMatches.rows.map((row, index) => ({ partido_id: row.id, categoria_id: "30000000-0000-0000-0000-000000000002", fecha_partido: `2027-04-0${index + 2}`, hora: "20:00", cancha: `Cancha B ${index + 1}`, estado: "listo" }));
    const batchResults = await Promise.all(batchSchedules.map((payload) => request("/rest/v1/rpc/apdb_upsert_match_schedule", {
      method: "POST", headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${associationBToken}`, "content-type": "application/json" },
      body: JSON.stringify({ p_payload: payload })
    })));
    assert(batchResults.every((item) => item.response.status === 200), "Batch schedule RPC did not persist all rows");
    const concurrentSchedules = await Promise.all([1, 2].map((suffix) => request("/rest/v1/rpc/apdb_upsert_match_schedule", {
      method: "POST", headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${associationBToken}`, "content-type": "application/json" },
      body: JSON.stringify({ p_payload: { partido_id: publishedMatches.rows[1].id, categoria_id: "30000000-0000-0000-0000-000000000002", fecha_partido: "2027-04-08", hora: `20:0${suffix}`, cancha: `Cancha concurrente ${suffix}`, estado: "listo" } })
    })));
    assert(concurrentSchedules.every((item) => item.response.status === 200), "Concurrent schedule updates were not serialized");
    const duplicatePublish = await publish(associationBToken, "30000000-0000-0000-0000-000000000002", fixturePayload);
    assert.notEqual(duplicatePublish.response.status, 200, "Published fixture was unexpectedly replaceable");

    const concurrentPayload = { p_match_id: matchConcurrent, p_home_score: 70, p_away_score: 60 };
    const concurrent = await Promise.all([callRpc(delegateToken, concurrentPayload), callRpc(delegateToken, { ...concurrentPayload, p_home_score: 71 })]);
    assert.equal(concurrent.filter((item) => item.response.status === 200).length, 1, "Concurrent result writes were not serialized");
    assert.equal(concurrent.filter((item) => item.response.status !== 200).length, 1, "Concurrent duplicate result was not rejected");

    const storagePath = `${orgA}/integration-${run}.txt`;
    const storageRequest = (token, path) => request(`/storage/v1/object/documentos/${path}`, {
      method: "POST",
      headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "content-type": "application/pdf", "x-upsert": "false" },
      body: Buffer.from("%PDF-1.4\n% synthetic APdB isolated document\n"),
    });
    const storageRead = (token, path) => request(`/storage/v1/object/documentos/${path}`, {
      headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    const uploaded = await storageRequest(delegateToken, storagePath);
    assert(uploaded.response.ok, `Authorized storage upload rejected: ${uploaded.response.status} ${JSON.stringify(uploaded.body)}`);
    const readable = await storageRead(delegateToken, storagePath);
    assert(readable.response.ok, `Authorized storage read rejected: ${readable.response.status} ${JSON.stringify(readable.body)}`);
    const otherToken = await login(users.delegateB.email);
    const crossRead = await storageRead(otherToken, storagePath);
    assert(!crossRead.response.ok, "Cross-organization storage read unexpectedly succeeded");
    const crossUpload = await storageRequest(otherToken, `${orgA}/cross-${run}.pdf`);
    assert(!crossUpload.response.ok, "Cross-organization storage upload unexpectedly succeeded");
    const directPatch = await request(`/rest/v1/partidos?id=eq.${matchA}`, {
      method: "PATCH",
      headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${delegateToken}`, "content-type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ puntos_local: 99, puntos_visitante: 1 }),
    });
    assert(!directPatch.response.ok, "Direct REST result write unexpectedly succeeded");
    await client.query("update app_users set active = false where auth_user_id = $1", [ids.delegateA]);
    const revoked = await request("/rest/v1/rpc/apdb_save_result", { method: "POST", headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${delegateToken}`, "content-type": "application/json" }, body: JSON.stringify({ p_match_id: matchA, p_home_score: 81, p_away_score: 70 }) });
    assert.notEqual(revoked.response.status, 200, "Revoked delegate modified a result");
    const crossOrg = await request("/rest/v1/rpc/apdb_save_result", { method: "POST", headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${otherToken}`, "content-type": "application/json" }, body: JSON.stringify({ p_match_id: matchA, p_home_score: 82, p_away_score: 70 }) });
    assert.notEqual(crossOrg.response.status, 200, "Cross-organization delegate modified a result");
    const revokedStorage = await storageRequest(delegateToken, `${orgA}/revoked-${run}.txt`);
    assert(!revokedStorage.response.ok, "Revoked delegate unexpectedly uploaded storage content");
    console.log("APDB_SUPABASE_ISOLATED_INTEGRATION_OK");
  } finally {
    await client.query("delete from playoff_matches where categoria_id = $1 and llave = $2", [categoryA, `semi-${run}`]).catch(() => {});
    await client.query("delete from match_schedules where partido_id in ($1, $2)", [matchA, matchConcurrent]).catch(() => {});
    await client.query("delete from match_schedules where categoria_id = $1", ["30000000-0000-0000-0000-000000000002"]).catch(() => {});
    await client.query("delete from partidos where id in ($1, $2)", [matchA, matchConcurrent]).catch(() => {});
    await client.query("delete from partidos where categoria_id = $1", ["30000000-0000-0000-0000-000000000002"]).catch(() => {});
    await client.end();
  }
})().catch((error) => { console.error(`APDB_SUPABASE_ISOLATED_INTEGRATION_FAILED ${error.message}`); process.exitCode = 1; });
