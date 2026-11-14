"use strict";

const assert = require("node:assert/strict");
const { Client } = require("pg");

for (const key of ["SUPABASE_URL", "SUPABASE_ANON_KEY", "DATABASE_URL", "APDB_BROWSER_PLAYOFF_CATEGORIES"]) {
  assert.ok(process.env[key], `${key} is required for isolated restart recovery`);
}
assert.doesNotMatch(process.env.SUPABASE_URL, /supabase\.co$/i, "Hosted Supabase target refused");

const categories = JSON.parse(Buffer.from(process.env.APDB_BROWSER_PLAYOFF_CATEGORIES, "base64").toString("utf8"));
assert.deepEqual(categories.map((item) => item.format).sort(), [4, 6, 8]);
const base = process.env.SUPABASE_URL.replace(/\/$/, "");
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function publicGet(path) {
  const response = await fetch(`${base}/rest/v1/${path}`, {
    headers: { apikey: process.env.SUPABASE_ANON_KEY }
  });
  const body = await response.text();
  assert.equal(response.status, 200, `Public read failed ${path}: HTTP ${response.status} ${body}`);
  return JSON.parse(body);
}

(async () => {
  await client.connect();
  try {
    for (const { categoryId, name, format } of categories) {
      const category = await client.query(
        "select id::text, torneo_id::text, nombre from categorias where id = $1",
        [categoryId]
      );
      assert.equal(category.rows[0]?.nombre, name, `Top ${format} category missing after service restart`);

      const teams = await client.query("select count(*)::int as count from equipos where categoria_id = $1", [categoryId]);
      assert.equal(teams.rows[0].count, format, `Top ${format} teams missing after service restart`);

      const regularMatches = await client.query(
        "select count(*)::int as total, count(*) filter (where puntos_local is not null and puntos_visitante is not null)::int as scored from partidos where categoria_id = $1",
        [categoryId]
      );
      assert.equal(regularMatches.rows[0].total, format * (format - 1) / 2, `Top ${format} fixture missing after service restart`);
      assert.equal(regularMatches.rows[0].scored, regularMatches.rows[0].total, `Top ${format} results missing after service restart`);

      const playoffs = await client.query(
        "select count(*)::int as total, count(*) filter (where puntos_local is not null and puntos_visitante is not null)::int as scored from playoff_matches where categoria_id = $1",
        [categoryId]
      );
      assert(playoffs.rows[0].total > 0, `Top ${format} playoff bracket missing after service restart`);
      assert.equal(playoffs.rows[0].scored, playoffs.rows[0].total, `Top ${format} playoff results missing after service restart`);

      const publicCategory = await publicGet(`categorias?id=eq.${encodeURIComponent(categoryId)}&select=id,nombre`);
      assert.equal(publicCategory[0]?.nombre, name, `Top ${format} category is not readable by Público after restart`);
      const publicMatches = await publicGet(`partidos?categoria_id=eq.${encodeURIComponent(categoryId)}&select=id,puntos_local,puntos_visitante`);
      assert.equal(publicMatches.length, regularMatches.rows[0].total, `Top ${format} fixture is not readable by Público after restart`);
      console.log(`APDB_RESTART_RECOVERED_TOP${format} ${JSON.stringify({ teams: teams.rows[0].count, fixture: regularMatches.rows[0].total, playoffs: playoffs.rows[0].total, publicMatches: publicMatches.length })}`);
    }

    const delegateMatch = await publicGet("partidos?id=eq.50000000-0000-0000-0000-000000000002&select=id,puntos_local,puntos_visitante");
    assert.equal(delegateMatch[0]?.puntos_local, 75, "Delegate result missing after service restart");
    assert.equal(delegateMatch[0]?.puntos_visitante, 68, "Delegate result missing after service restart");
    console.log("APDB_RESTART_RECOVERED_DELEGATE_RESULT_AND_PUBLIC_READ true");
  } finally {
    await client.end();
  }
})().catch((error) => {
  console.error(`APDB_ISOLATED_RESTART_RECOVERY_FAILED ${error.stack || error.message}`);
  process.exitCode = 1;
});
