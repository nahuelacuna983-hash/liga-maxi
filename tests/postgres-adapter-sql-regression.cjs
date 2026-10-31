"use strict";

const assert = require("node:assert/strict");
const PostgresRepository = require("../demo_2027_postgres_repository.js");

const calls = [];
const client = {
  async query(sql, params) {
    calls.push({ sql, params });
    if (sql.startsWith("insert into lm_demo_match_history")) return { rows: [] };
    return { rows: [] };
  },
  release() {}
};
const repository = new PostgresRepository({ connect: async () => client });

(async () => {
  await repository.saveFixture(
    "00000000-0000-4000-8000-000000000003",
    [{ id: "00000000-0000-4000-8000-000000000021", round: 0, homeTeamId: "00000000-0000-4000-8000-000000000011", awayTeamId: "00000000-0000-4000-8000-000000000012" }],
    "00000000-0000-4000-8000-000000000004"
  );
  const historyCall = calls.find(({ sql }) => sql.startsWith("insert into lm_demo_match_history"));
  assert.ok(historyCall, "saveFixture debe registrar el historial");
  assert.match(historyCall.sql, /jsonb_build_object\('category_id',\$1::uuid\)/);
  assert.match(historyCall.sql, /where category_id=\$1::uuid/);
  assert.equal(historyCall.params[0], "00000000-0000-4000-8000-000000000003");
  console.log("POSTGRES_ADAPTER_SQL_REGRESSION_OK");
})().catch((error) => { console.error(error); process.exitCode = 1; });
