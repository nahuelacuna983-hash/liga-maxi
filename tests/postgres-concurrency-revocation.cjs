"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { Pool } = require("pg");
const PostgresRepository = require("../demo_2027_postgres_repository.js");

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ids = { org: id(501), organizer: id(502), delegate: id(503), tournament: id(504), category: id(505), home: id(506), away: id(507), match: id(508) };
const pool = () => new Pool({ connectionString: process.env.DATABASE_URL });

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

async function main() {
  const setup = pool();
  await setup.query(await fs.readFile(path.join(__dirname, "..", "docs", "demo-2027-postgres-schema.sql"), "utf8"));
  await seed(setup);

  // The result transaction locks the match before the revocation transaction can remove membership.
  const resultClient = await setup.connect();
  const revokeClient = await setup.connect();
  await resultClient.query("begin");
  await resultClient.query("select id from lm_demo_matches where id=$1 for update", [ids.match]);
  const revoke = (async () => {
    await revokeClient.query("begin");
    await revokeClient.query("select id from lm_demo_matches where id=$1 for update", [ids.match]);
    await revokeClient.query("delete from lm_demo_memberships where user_id=$1 and organization_id=$2", [ids.delegate, ids.org]);
    await revokeClient.query("commit");
  })();
  const resultUpdate = resultClient.query("update lm_demo_matches set home_score=80,away_score=70,result_state='played' where id=$1 and result_state='pending'", [ids.match]);
  await resultUpdate;
  await resultClient.query("insert into lm_demo_match_history(match_id,actor_id,action,payload) values($1,$2,'result_saved','{}')", [ids.match, ids.delegate]);
  await resultClient.query("commit");
  await revoke;
  resultClient.release(); revokeClient.release();

  const afterFirstOrder = await setup.query("select result_state,home_score,away_score from lm_demo_matches where id=$1", [ids.match]);
  assert.deepEqual(afterFirstOrder.rows[0], { result_state: "played", home_score: 80, away_score: 70 }, "el resultado confirmado antes del bloqueo debe conservarse");
  assert.equal((await setup.query("select 1 from lm_demo_memberships where user_id=$1 and organization_id=$2", [ids.delegate, ids.org])).rowCount, 0);

  await setup.query("insert into lm_demo_memberships(user_id,organization_id) values($1,$2) on conflict do nothing", [ids.delegate, ids.org]);
  await setup.query("insert into lm_demo_delegate_assignments(user_id,category_id,team_id) values($1,$2,$3) on conflict do nothing", [ids.delegate, ids.category, ids.home]);
  await setup.query("update lm_demo_matches set result_state='pending',home_score=null,away_score=null where id=$1", [ids.match]);
  await setup.query("delete from lm_demo_match_history where match_id=$1", [ids.match]);
  await setup.query("delete from lm_demo_memberships where user_id=$1 and organization_id=$2", [ids.delegate, ids.org]);
  await assert.rejects(() => new PostgresRepository(setup).saveDelegateResult({ matchId: ids.match, actor: { sub: ids.delegate }, homeScore: 81, awayScore: 71 }));
  const afterSecondOrder = await setup.query("select result_state,home_score,away_score from lm_demo_matches where id=$1", [ids.match]);
  assert.deepEqual(afterSecondOrder.rows[0], { result_state: "pending", home_score: null, away_score: null }, "la revocación efectiva debe impedir la escritura");
  await setup.end();
  console.log("POSTGRES_CONCURRENCY_REVOCATION_OK");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
