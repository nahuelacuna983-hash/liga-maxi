const assert = require('node:assert/strict');
const fs = require('node:fs');

const migration = fs.readFileSync(
  'supabase/migrations/20261122000001_apdb_administrative_onboarding_reconcile.sql',
  'utf8'
);

assert.match(migration, /non-destructive/i);
assert.match(migration, /pg_get_functiondef/);
assert.match(migration, /has_function_privilege\('anon'/);
assert.match(migration, /has_function_privilege\('authenticated'/);
assert.match(migration, /target\.role = ''delegado''/);
assert.match(migration, /p\.torneo_id is not null/);
assert.match(migration, /p\.categoria_id is not null/);
assert.match(migration, /p\.equipo_id is not null/);
assert.doesNotMatch(migration, /drop\s+(table|function|policy)|delete\s+from|truncate|alter\s+table/i);

console.log('APDB_ADMINISTRATIVE_RECONCILIATION_CONTRACT_OK');
