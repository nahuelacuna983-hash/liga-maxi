#!/usr/bin/env node
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const base = process.env.APDB_STORAGE_API_URL;
const key = process.env.APDB_STORAGE_API_KEY;
const bucket = process.env.APDB_STORAGE_BUCKET;
const rawOutput = process.env.APDB_STORAGE_EXPORT_DIR;
const output = rawOutput ? path.resolve(rawOutput) : '';
const restoreBase = process.env.APDB_STORAGE_RESTORE_API_URL;
const restoreKey = process.env.APDB_STORAGE_RESTORE_API_KEY;
if (!base || !key || !bucket || !rawOutput) throw new Error('APDB_STORAGE_API_URL, APDB_STORAGE_API_KEY, APDB_STORAGE_BUCKET and APDB_STORAGE_EXPORT_DIR are required');
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(base.replace(/\/$/, ''))) throw new Error('source Storage API must target localhost');
if (restoreBase && !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(restoreBase.replace(/\/$/, ''))) throw new Error('restore Storage API must target localhost');
if (restoreBase && !restoreKey) throw new Error('APDB_STORAGE_RESTORE_API_KEY is required with restore URL');
const repoRoot = path.resolve(__dirname, '..');
if (output === path.parse(output).root || output === repoRoot || output.startsWith(`${repoRoot}${path.sep}`)) throw new Error('APDB_STORAGE_EXPORT_DIR must be outside the repository and not a filesystem root');
const headers = { Authorization: `Bearer ${key}`, apikey: key };
async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`Storage API ${response.status} ${response.statusText}`);
  return response;
}
async function list(prefix = '') {
  const response = await request(`${base.replace(/\/$/, '')}/storage/v1/object/list/${encodeURIComponent(bucket)}`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ prefix, limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } }) });
  return response.json();
}
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const entries = await list();
  const objects = entries.filter(entry => entry.id && entry.name).map(entry => entry.name);
  const inventory = [];
  for (const objectPath of objects) {
    const response = await request(`${base.replace(/\/$/, '')}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath.split('/').map(encodeURIComponent).join('/')}`, { headers });
    const data = Buffer.from(await response.arrayBuffer());
    const file = path.join(output, objectPath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data, { flag: 'wx' });
    inventory.push({ path: objectPath, bytes: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex') });
  }
  const manifest = { generatedAt: new Date().toISOString(), source: base, bucket, objects: inventory, metadataAndPolicies: 'not included; export separately from Storage metadata and SQL policies' };
  fs.writeFileSync(path.join(output, 'storage-api-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  if (restoreBase) {
    for (const item of inventory) {
      const data = fs.readFileSync(path.join(output, item.path));
      const response = await fetch(`${restoreBase.replace(/\/$/, '')}/storage/v1/object/${encodeURIComponent(bucket)}/${item.path.split('/').map(encodeURIComponent).join('/')}`, { method: 'POST', headers: { Authorization: `Bearer ${restoreKey}`, apikey: restoreKey, 'content-type': 'application/octet-stream', 'x-upsert': 'false' }, body: data });
      if (!response.ok) throw new Error(`Storage restore ${response.status} ${response.statusText}`);
    }
  }
  console.log(JSON.stringify({ marker: restoreBase ? 'APDB_SUPABASE_STORAGE_EXPORT_RESTORE_PREPARED' : 'APDB_SUPABASE_STORAGE_EXPORT_OK', bucket, objects: inventory.length, manifest: path.join(output, 'storage-api-manifest.json') }));
}
main().catch(error => { console.error(`APDB_SUPABASE_STORAGE_FAILED: ${error.message}`); process.exitCode = 1; });
