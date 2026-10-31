"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { Pool } = require("pg");
const PostgresRepository = require("../demo_2027_postgres_repository");

const ids = {
  organization: "00000000-0000-4000-8000-000000000001",
  tournament: "00000000-0000-4000-8000-000000000002",
  category: "00000000-0000-4000-8000-000000000003",
  actor: "00000000-0000-4000-8000-000000000004",
  teams: ["00000000-0000-4000-8000-000000000011", "00000000-0000-4000-8000-000000000012", "00000000-0000-4000-8000-000000000013", "00000000-0000-4000-8000-000000000014"],
  matches: ["00000000-0000-4000-8000-000000000021", "00000000-0000-4000-8000-000000000022", "00000000-0000-4000-8000-000000000023", "00000000-0000-4000-8000-000000000024", "00000000-0000-4000-8000-000000000025", "00000000-0000-4000-8000-000000000026"]
};

function makePool() { return new Pool({ connectionString: process.env.DATABASE_URL }); }
async function count(pool, table, categoryId) { const result = await pool.query(`select count(*)::int as count from ${table} where category_id=$1`, [categoryId]); return result.rows[0].count; }

async function main() {
  const pool = makePool();
  const schema = await fs.readFile(path.join(__dirname, "..", "docs", "demo-2027-postgres-schema.sql"), "utf8");
  await pool.query(schema);
  const repo = new PostgresRepository(pool);
  await repo.createTournament({ id: ids.tournament, organizationId: ids.organization, name: "Liga Maxi 2027 PostgreSQL", season: 2027 });
  await repo.createCategory({ id: ids.category, tournamentId: ids.tournament, name: "Maxi +35 A" });
  for (const [index, id] of ids.teams.entries()) await repo.addTeam({ id, categoryId: ids.category, name: `Equipo ${index + 1}` });
  const matches = [
    [0, 0, 1], [0, 2, 3], [1, 0, 2], [1, 1, 3], [2, 0, 3], [2, 1, 2]
  ].map(([round, home, away], index) => ({ id: ids.matches[index], round, homeTeamId: ids.teams[home], awayTeamId: ids.teams[away] }));
  assert.equal(await repo.saveFixture(ids.category, matches, ids.actor), 6);
  await repo.scheduleMatch({ matchId: ids.matches[0], actorId: ids.actor, scheduledAt: "2027-04-11T15:00:00Z", court: "Cancha 1" });
  await repo.saveResult({ matchId: ids.matches[0], actorId: ids.actor, homeScore: 72, awayScore: 68 });

  const beforeRollback = await count(pool, "lm_demo_matches", ids.category);
  await assert.rejects(() => repo.saveFixture(ids.category, [{ ...matches[1], id: ids.matches[0] }], ids.actor));
  assert.equal(await count(pool, "lm_demo_matches", ids.category), beforeRollback, "rollback debe evitar inserción parcial");
  await assert.rejects(() => repo.scheduleMatch({ matchId: ids.matches[0], actorId: ids.actor, scheduledAt: "2027-04-18T15:00:00Z", court: "Cancha 2" }));

  const poolA = makePool(); const poolB = makePool();
  const repoA = new PostgresRepository(poolA); const repoB = new PostgresRepository(poolB);
  const concurrent = await Promise.allSettled([
    repoA.saveResult({ matchId: ids.matches[1], actorId: ids.actor, homeScore: 61, awayScore: 57 }),
    repoB.saveResult({ matchId: ids.matches[1], actorId: ids.actor, homeScore: 63, awayScore: 59 })
  ]);
  assert.equal(concurrent.filter((entry) => entry.status === "fulfilled").length, 1, "sólo un resultado concurrente puede confirmar");
  assert.equal(concurrent.filter((entry) => entry.status === "rejected").length, 1, "la segunda escritura debe rechazarse");
  await poolA.end(); await poolB.end();

  await pool.end();
  const restarted = makePool();
  const recovered = await new PostgresRepository(restarted).readCategory(ids.category);
  assert.equal(recovered.matches.length, 6);
  assert.equal(recovered.matches.find((match) => match.id === ids.matches[0]).home_score, 72);
  assert.ok(recovered.history.some((entry) => entry.action === "fixture_saved"));
  assert.ok(recovered.history.some((entry) => entry.action === "result_saved"));
  await restarted.end();
  console.log("POSTGRES_ADAPTER_INTEGRATION_OK");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
