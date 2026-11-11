"use strict";
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { Client } = require("pg");
const Provider = require("../demo_2027_provider.js");

for (const key of ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL"]) {
  assert.ok(process.env[key], `${key} is required`);
}
assert.doesNotMatch(process.env.SUPABASE_URL, /supabase\.co$/i, "hosted Supabase target refused");
const base = process.env.SUPABASE_URL.replace(/\/$/, "");
const run = crypto.randomUUID().replaceAll("-", "").slice(0, 10);
const password = `Championship-${crypto.randomBytes(12).toString("hex")}!a1`;
const orgId = "10000000-0000-0000-0000-000000000001";
const tournamentId = "20000000-0000-0000-0000-000000000001";
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const text = await response.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { response, body };
}
function headers(token) {
  return { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "content-type": "application/json" };
}
async function createUser(email) {
  const result = await request("/auth/v1/admin/users", { method: "POST", headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ email, password, email_confirm: true }) });
  assert.equal(result.response.status, 200, `Auth setup failed: ${result.response.status}`);
  return result.body.id;
}
async function login(email) {
  const result = await request("/auth/v1/token?grant_type=password", { method: "POST", headers: { apikey: process.env.SUPABASE_ANON_KEY, "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  assert.equal(result.response.status, 200, `login failed: ${result.response.status}`);
  return result.body.access_token;
}
function providerFor(format, teams) {
  const provider = new Provider();
  provider.setCategoryTeams("asoc-demo", "maxi-a", teams);
  provider.generateFixture("asoc-demo", "maxi-a", { start: "2027-06-01" });
  for (const match of provider.getMatches("maxi-a")) provider.loadResult("maxi-a", match.partido_numero, 80, 70);
  provider.generatePlayoffs("maxi-a", format, { seriesGames: format === 6 ? 2 : 1 });
  for (const round of ["repechaje", "cuartos", "semifinales", "final"]) {
    const pending = provider.getPlayoffMatches("maxi-a").filter((match) => match.ronda === round && match.puntos_local == null);
    if (!pending.length) continue;
    const winners = new Map();
    for (const match of pending) {
      const winner = winners.get(match.llave) || match.local;
      winners.set(match.llave, winner);
      provider.loadPlayoffResult("maxi-a", match.partido_numero, match.local === winner ? 80 : 60, match.local === winner ? 60 : 80);
    }
    provider.advancePlayoffs("maxi-a");
  }
  assert.ok(provider.getChampion("maxi-a"), `Top ${format} did not produce a champion`);
  return provider;
}

(async () => {
  await client.connect();
  const categories = [];
  const users = [];
  try {
    const associationEmail = `championship-association-${run}@example.invalid`;
    const associationId = await createUser(associationEmail);
    users.push(associationId);
    await client.query("insert into app_users (id, auth_user_id, organizacion_id, display_name, role) values ($1,$1,$2,$3,'asociacion')", [associationId, orgId, `Asociación campeonato ${run}`]);
    const associationToken = await login(associationEmail);

    for (const format of [4, 6, 8]) {
      const categoryId = crypto.randomUUID();
      const delegateEmail = `championship-delegate-${format}-${run}@example.invalid`;
      const delegateId = await createUser(delegateEmail);
      users.push(delegateId);
      const categoryName = `Campeonato Top ${format} ${run}`;
      const category = await request("/rest/v1/categorias", { method: "POST", headers: { ...headers(process.env.SUPABASE_SERVICE_ROLE_KEY), apikey: process.env.SUPABASE_SERVICE_ROLE_KEY }, body: JSON.stringify({ id: categoryId, torneo_id: tournamentId, nombre: categoryName, estado: "borrador" }) });
      assert.equal(category.response.status, 201, `category setup failed: ${category.response.status}`);
      categories.push(categoryId);
      await client.query("insert into app_users (id, auth_user_id, organizacion_id, display_name, role) values ($1,$1,$2,$3,'delegado')", [delegateId, orgId, `Delegado Top ${format}`]);
      await client.query("insert into app_user_permissions (user_id, organizacion_id, torneo_id, categoria_id, can_view, can_load_results) values ($1,$2,$3,$4,true,true)", [delegateId, orgId, tournamentId, categoryId]);
      const delegateToken = await login(delegateEmail);
      const teams = Array.from({ length: format }, (_, index) => `Top ${format} equipo ${index + 1}`);
      const fixture = teams.flatMap((local, index) => teams.slice(index + 1).map((visitante, offset) => ({ local, visitante, jornada: index + offset + 1, fecha: `2027-07-${String(index + offset + 1).padStart(2, "0")}`, libre: null })));
      const published = await request("/rest/v1/rpc/apdb_publish_fixture", { method: "POST", headers: headers(associationToken), body: JSON.stringify({ p_categoria_id: categoryId, p_category_payload: { estado: "publicada", formato: `Top ${format}`, playoffs: true, clasificados: format }, p_matches: fixture }) });
      assert.equal(published.response.status, 200, `Top ${format} fixture publication failed: ${published.response.status}`);
      const persistedMatches = await client.query("select id from partidos where categoria_id = $1 order by jornada, id", [categoryId]);
      assert.equal(persistedMatches.rows.length, fixture.length, `Top ${format} fixture count mismatch`);
      for (const row of persistedMatches.rows) {
        const result = await request("/rest/v1/rpc/apdb_save_result", { method: "POST", headers: headers(delegateToken), body: JSON.stringify({ p_match_id: row.id, p_home_score: 80, p_away_score: 70 }) });
        assert.equal(result.response.status, 200, `Top ${format} delegate result failed: ${result.response.status}`);
      }
      const provider = providerFor(format, teams);
      for (const playoff of provider.getPlayoffMatches("maxi-a")) {
        const saved = await request("/rest/v1/rpc/apdb_upsert_playoff_match", { method: "POST", headers: headers(associationToken), body: JSON.stringify({ p_payload: { categoria_id: categoryId, categoria_nombre: categoryName, fase: playoff.ronda, llave: playoff.llave, titulo: `Top ${format} ${playoff.ronda}`, orden: playoff.partido_numero, partido_numero: playoff.partido_numero, local: playoff.local, visitante: playoff.visitante, puntos_local: playoff.puntos_local, puntos_visitante: playoff.puntos_visitante, estado: "jugado" } }) });
        assert.equal(saved.response.status, 200, `Top ${format} playoff persistence failed: ${saved.response.status}`);
      }
      const persistedPlayoffs = await client.query("select count(*)::int as count from playoff_matches where categoria_id = $1", [categoryId]);
      assert.equal(persistedPlayoffs.rows[0].count, provider.getPlayoffMatches("maxi-a").length, `Top ${format} playoff count mismatch`);
      const direct = await request(`/rest/v1/partidos?categoria_id=eq.${categoryId}`, { method: "PATCH", headers: headers(delegateToken), body: JSON.stringify({ puntos_local: 1, puntos_visitante: 1 }) });
      assert(!direct.response.ok, `Top ${format} direct fixture mutation unexpectedly succeeded`);
    }
    console.log("APDB_CHAMPIONSHIP_ISOLATED_INTEGRATION_OK");
  } finally {
    for (const categoryId of categories) await request(`/rest/v1/categorias?id=eq.${categoryId}`, { method: "DELETE", headers: { ...headers(process.env.SUPABASE_SERVICE_ROLE_KEY), apikey: process.env.SUPABASE_SERVICE_ROLE_KEY } }).catch(() => {});
    for (const userId of users) { await client.query("delete from app_user_permissions where user_id = $1", [userId]).catch(() => {}); await client.query("delete from app_users where id = $1", [userId]).catch(() => {}); await request(`/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: { ...headers(process.env.SUPABASE_SERVICE_ROLE_KEY), apikey: process.env.SUPABASE_SERVICE_ROLE_KEY } }).catch(() => {}); }
    await client.end();
  }
})().catch((error) => { console.error(`APDB_CHAMPIONSHIP_ISOLATED_INTEGRATION_FAILED ${error.message}`); process.exitCode = 1; });
