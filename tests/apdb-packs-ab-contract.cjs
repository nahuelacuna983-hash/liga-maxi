const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const backup = fs.readFileSync(path.resolve('tools/postgres-backup-restore.cjs'), 'utf8');
const preflight = fs.readFileSync(path.resolve('tests/security/apdb_packs_ab_preflight.sql'), 'utf8');
assert.match(backup, /rls_enabled/);
assert.match(backup, /role_table_grants/);
assert.match(backup, /APDB_BACKUP_SOURCE_URL/);
assert.match(backup, /source and target must be different databases/);
assert.match(preflight, /APDB_PACKS_AB_PREFLIGHT_FAILED/);
assert.match(preflight, /legacy_document_views_not_public/);
assert.match(preflight, /storage_scope_present/);
assert.doesNotMatch(preflight, /delete\s+from|truncate|drop\s+(table|schema)/i);
console.log('APDB_PACKS_AB_CONTRACT_OK');
