"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { Pool } = require("pg");
const PostgresRepository = require("../demo_2027_postgres_repository.js");
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ids = { org: id(501), organizer: id(502), delegate: id(503), tournament: id(504), category: id(505), home: id(506), away: id(507), match: id(508) };
const pool = () => new Pool({ connectionString: process.env.DATABASE_URL });
const actor = { sub: ids.delegate };
async function seed(db) {
  await db.query("insert into lm_demo_organizations(id,name) values($1,$2) on conflict (id) do nothing", [ids.org, "Concurrencia sintética"]);
  await db.query("insert into lm_demo_users(id,username,role) values($1,'concurrency-organizer','organizer'),($2,'concurrency-delegate','delegate') on conflict (id) do nothing", [ids.organizer, ids.delegate]);
  await db.query("insert into lm_demo_memberships(user_id,organization_id) values($1,$3),($2,$3) on conflict do nothing", [ids.organizer, ids.delegate, ids.org]);
  await db.query("insert into lm_demo_tournaments(id,organization_id,name,season,state) values($1,$2,'Concurrencia',2027,'draft') on conflict (id) do nothing", [ids.tournament, ids.org]);
  await db.query("insert into lm_demo_categories(id,tournament_id,name) values($1,$2,'Concurrencia') on conflict (id) do nothing", [ids.category, ids.tournament]);
  await db.query("insert into lm_demo_teams(id,category_id,name) values($1,$3,'Local'),($2,$3,'Visitante') on conflict (id) do nothing", [ids.home, ids.away, ids.category]);
  await db.query("insert into lm_demo_matches(id,category_id,round_no,home_team_id,away_team_id) values($1,$2,1,$3,$4) on conflict (id) do update set result_state='pending',home_score=null,away_score=null", [ids.match, ids.category, ids.home, ids.away]);
  await db.query("insert into lm_demo_delegate_assignments(user_id,category_id,team_id) values($1,$2,$3) on conflict do nothing", [ids.delegate, ids.category, ids.home]);
}
async function resetForSecondOrder(db) {
  await db.query("update lm_demo_matches set result_state='pending',home_score=null,away_score=null where id=$1", [ids.match]);
  await db.query("delete from lm_demo_match_history where match_id=$1", [ids.match]);
  await db.query("insert into lm_demo_memberships(user_id,organization_id) values($1,$2) on conflict do nothing", [ids.delegate, ids.org]);
  await db.query("insert into lm_demo_delegate_assignments(user_id,category_id,team_id) values($1,$2,$3) on conflict do nothing", [ids.delegate, ids.category, ids.home]);
}
(async () => {
  const db = pool();
  await db.query(await fs.readFile(path.join(__dirname, "..", "docs", "demo-2027-postgres-schema.sql"), "utf8"));
  await seed(db);
  const repoA = new PostgresRepository(pool());
  const repoB = new PostgresRepository(pool());
  const firstOrder = await Promise.allSettled([
    repoA.saveDelegateResult({ matchId: ids.match, actor, homeScore: 80, awayScore: 70 }),
    repoB.revokeMembership({ userId: ids.delegate, organizationId: ids.org }, { sub: ids.organizer, role: "organizer", organizationId: ids.org })
  ]);
  assert.ok(firstOrder.some((entry) => entry.status === "fulfilled" && entry.value?.result_state === "played"), "el resultado debe confirmarse cuando su transacción adquiere primero el alcance");
  assert.equal((await db.query("select count(*)::int as count from lm_demo_memberships where user_id=$1 and organization_id=$2", [ids.delegate, ids.org])).rows[0].count, 0);
  assert.equal((await db.query("select count(*)::int as count from lm_demo_match_history where match_id=$1 and action='result_saved'", [ids.match])).rows[0].count, 1);
  await resetForSecondOrder(db);
  await repoB.revokeMembership({ userId: ids.delegate, organizationId: ids.org }, { sub: ids.organizer, role: "organizer", organizationId: ids.org });
  await assert.rejects(() => repoA.saveDelegateResult({ matchId: ids.match, actor, homeScore: 81, awayScore: 71 }));
  assert.deepEqual((await db.query("select result_state,home_score,away_score from lm_demo_matches where id=$1", [ids.match])).rows[0], { result_state: "pending", home_score: null, away_score: null });
  assert.equal((await db.query("select count(*)::int as count from lm_demo_match_history where match_id=$1 and action='result_saved'", [ids.match])).rows[0].count, 0);
  await repoA.pool.end(); await repoB.pool.end(); await db.end();
  console.log("POSTGRES_CONCURRENCY_REVOCATION_OK");
})().catch((error) => { console.error(error); process.exitCode = 1; });
