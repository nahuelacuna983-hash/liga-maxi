"use strict";
// Fail closed if an APdB SECURITY DEFINER RPC is exposed to anonymous callers.
// Runs on the disposable local PostgreSQL instance; never mutates the database.
const assert = require("node:assert/strict");
const { Client } = require("pg");

const rawUrl = process.env.DATABASE_URL || "";
assert.ok(rawUrl, "Missing local DATABASE_URL");
const url = new URL(rawUrl);
assert.ok(["localhost", "127.0.0.1"].includes(url.hostname), "Hosted database refused");

(async () => {
  const client = new Client({ connectionString: rawUrl });
  await client.connect();
  try {
    const result = await client.query(`
      select p.proname, p.oid::regprocedure::text as signature,
             p.prosecdef as security_definer,
             has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
             has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and left(p.proname, 5) = 'apdb_'
       order by p.proname
    `);
    assert.ok(result.rowCount >= 12, "Unexpectedly few APdB privileged functions; review migration contracts");
    for (const fn of result.rows) {
      assert.equal(fn.security_definer, true, `${fn.signature} unexpectedly changed execution mode`);
      assert.equal(fn.anon_can_execute, false, `${fn.signature} exposed to anonymous visitors`);
    }
    const required = [
      "apdb_association_update_result",
      "apdb_document_access_allowed",
      "apdb_ensure_tournament_category_teams",
      "apdb_publish_fixture",
      "apdb_revoke_delegate_scope",
      "apdb_save_result",
      "apdb_set_delegate_scope",
      "apdb_storage_team_path_allowed",
      "apdb_upsert_match_schedule",
      "apdb_upsert_playoff_match"
    ];
    for (const name of required) {
      const found = result.rows.find(fn => fn.proname === name);
      assert.ok(found, `Missing expected APdB function ${name}`);
      assert.equal(found.authenticated_can_execute, true, `Authorized RPC became inaccessible: ${name}`);
    }
    console.log(`APDB_PRIVILEGED_FUNCTION_GRANTS_OK checked=${result.rowCount} anonymous=0 required_authenticated=${required.length}`);
  } finally {
    await client.end();
  }
})().catch(err => {
  console.error("APDB_PRIVILEGED_FUNCTION_GRANTS_FAILED", err.message);
  process.exitCode = 1;
});
