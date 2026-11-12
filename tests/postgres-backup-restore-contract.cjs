const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const file = path.resolve(__dirname, '..', 'tools', 'postgres-backup-restore.cjs');
const source = fs.readFileSync(file, 'utf8');
assert.match(source, /APDB_BACKUP_SOURCE_URL/);
assert.match(source, /APDB_BACKUP_TARGET_URL/);
assert.match(source, /pg_dump/);
assert.match(source, /pg_restore/);
assert.match(source, /APDB_BACKUP_DIR must be outside the repository/);
assert.match(source, /cannot target a hosted Supabase endpoint/);
assert.match(source, /APDB_POSTGRES_BACKUP_RESTORE_OK/);
assert.match(source, /schema columns, table catalog and row counts/);
assert.doesNotMatch(source, /service_role|supabase_key|BEGIN PRIVATE KEY/i);
console.log('APDB_POSTGRES_BACKUP_RESTORE_CONTRACT_OK');
