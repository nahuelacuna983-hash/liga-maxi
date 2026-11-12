#!/usr/bin/env node
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');

const sourceUrl = process.env.APDB_BACKUP_SOURCE_URL;
const targetUrl = process.env.APDB_BACKUP_TARGET_URL;
const backupDir = path.resolve(process.env.APDB_BACKUP_DIR || path.join(os.tmpdir(), 'apdb-backups'));
const repoRoot = path.resolve(__dirname, '..');

function fail(message) { throw new Error(message); }
function requireUrl(name, value) {
  if (!value) fail(`${name} is required`);
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) fail(`${name} must be a PostgreSQL URL`);
  if (/supabase\.co|supabase\.com|\.pooler\./i.test(url.hostname)) fail(`${name} cannot target a hosted Supabase endpoint`);
  if (!['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) fail(`${name} must target localhost`);
  return url;
}
function command(name) {
  const root = process.env.PG_BIN || (process.platform === 'win32' ? 'C:\\Program Files\\PostgreSQL\\16\\bin' : '');
  const file = path.join(root, process.platform === 'win32' ? `${name}.exe` : name);
  if (!fs.existsSync(file)) fail(`Missing PostgreSQL tool: ${file}`);
  return file;
}
function run(file, args, env = {}) {
  const result = spawnSync(file, args, { encoding: 'utf8', env: { ...process.env, ...env }, windowsHide: true });
  if (result.status !== 0) fail(`${path.basename(file)} failed: ${result.stderr.trim() || result.stdout.trim()}`);
  return result.stdout;
}
function pgpass(url) {
  const password = decodeURIComponent(url.password || '');
  if (!password) return { env: {}, cleanup() {} };
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'apdb-pgpass-')), 'pgpass');
  fs.writeFileSync(file, `${url.hostname}:${url.port || 5432}:${url.pathname.slice(1)}:${decodeURIComponent(url.username)}:${password}\n`, { mode: 0o600 });
  return { env: { PGPASSFILE: file }, cleanup() { fs.rmSync(path.dirname(file), { recursive: true, force: true }); } };
}
function dumpArgs(url, file) { return ['--format=custom', '--no-owner', '--no-privileges', '--file', file, '--host', url.hostname, '--port', url.port || '5432', '--username', decodeURIComponent(url.username), '--dbname', decodeURIComponent(url.pathname.slice(1))]; }
function restoreArgs(url, file) { return ['--clean', '--if-exists', '--no-owner', '--no-privileges', '--exit-on-error', '--host', url.hostname, '--port', url.port || '5432', '--username', decodeURIComponent(url.username), '--dbname', decodeURIComponent(url.pathname.slice(1)), file]; }
async function snapshot(url) {
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  const tables = await client.query("select n.nspname as schema, c.relname as table from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname not in ('pg_catalog','information_schema') order by 1,2");
  const rows = await client.query("select table_schema, table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), true, false, '')))[1]::text::bigint as count from information_schema.tables where table_type='BASE TABLE' and table_schema not in ('pg_catalog','information_schema') order by 1,2");
  const columns = await client.query("select table_schema, table_name, column_name, data_type, ordinal_position from information_schema.columns where table_schema not in ('pg_catalog','information_schema') order by 1,2,5");
  await client.end();
  return { tables: tables.rows, rows: rows.rows, columns: columns.rows };
}
async function main() {
  const source = requireUrl('APDB_BACKUP_SOURCE_URL', sourceUrl);
  const target = requireUrl('APDB_BACKUP_TARGET_URL', targetUrl);
  if (path.resolve(backupDir).startsWith(repoRoot + path.sep)) fail('APDB_BACKUP_DIR must be outside the repository');
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dump = path.join(backupDir, `apdb-postgres-${stamp}.dump`);
  const before = await snapshot(source.toString());
  const sourceAuth = pgpass(source);
  const targetAuth = pgpass(target);
  try {
    run(command('pg_dump'), dumpArgs(source, dump), sourceAuth.env);
    run(command('pg_restore'), restoreArgs(target, dump), targetAuth.env);
  } finally { sourceAuth.cleanup(); targetAuth.cleanup(); }
  const after = await snapshot(target.toString());
  assert.deepEqual(after, before, 'restored structure or row counts differ from source');
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(dump)).digest('hex');
  const manifest = { generatedAt: new Date().toISOString(), source: { host: source.hostname, port: source.port || '5432', database: source.pathname.slice(1) }, target: { host: target.hostname, port: target.port || '5432', database: target.pathname.slice(1) }, dump: path.basename(dump), bytes: fs.statSync(dump).size, sha256, comparison: 'equal: schema columns, table catalog and row counts' };
  const manifestPath = `${dump}.manifest.json`;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ marker: 'APDB_POSTGRES_BACKUP_RESTORE_OK', manifest: manifestPath, dumpBytes: manifest.bytes, sha256: manifest.sha256 }));
}
main().catch(error => { console.error(`APDB_POSTGRES_BACKUP_RESTORE_FAILED: ${error.message}`); process.exitCode = 1; });
