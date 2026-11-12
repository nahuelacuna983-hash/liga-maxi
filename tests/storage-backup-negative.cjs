const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const script = path.resolve(__dirname, '..', 'tools', 'storage-backup-restore.cjs');
function fails(env) { const result = spawnSync(process.execPath, [script], { env: { ...process.env, ...env }, encoding: 'utf8' }); assert.notEqual(result.status, 0); return `${result.stdout}${result.stderr}`; }
assert.match(fails({ APDB_STORAGE_SOURCE: '', APDB_STORAGE_TARGET: '' }), /required/);
assert.match(fails({ APDB_STORAGE_SOURCE: path.parse(process.cwd()).root, APDB_STORAGE_TARGET: 'C:\\Temp\\apdb-target' }), /filesystem root/);
assert.match(fails({ APDB_STORAGE_SOURCE: process.cwd(), APDB_STORAGE_TARGET: 'C:\\Temp\\apdb-target' }), /inside the repository/);
assert.match(fails({ APDB_STORAGE_SOURCE: 'C:\\Temp\\apdb-source', APDB_STORAGE_TARGET: process.cwd() }), /inside the repository/);
console.log('APDB_STORAGE_BACKUP_NEGATIVE_OK');
