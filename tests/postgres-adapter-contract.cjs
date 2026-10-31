const assert = require('node:assert/strict');
const PostgresRepository = require('../demo_2027_postgres_repository.js');

const queries = [];
const client = { query: async (sql) => { queries.push(sql); if (sql === 'COMMIT') throw new Error('commit failure'); return { rows: [] }; }, release: () => {} };
const pool = { connect: async () => client };
(async () => {
  const repository = new PostgresRepository(pool);
  await assert.rejects(() => repository.transaction(async (db) => { await db.query('select 1'); }), /commit failure/);
  assert.deepEqual(queries.slice(0, 2), ['BEGIN', 'select 1']);
  assert.equal(queries.at(-1), 'ROLLBACK');
  console.log('POSTGRES_ADAPTER_CONTRACT_OK');
})().catch((error) => { console.error(error); process.exitCode = 1; });
