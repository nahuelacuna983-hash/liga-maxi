const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const base = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key || !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(base)) throw new Error('isolated local SUPABASE_URL and service key are required');
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'content-type': 'application/json' };
const runId = crypto.randomUUID().replaceAll('-', '').slice(0, 16);
const sourceBucket = `apdb-src-${runId}`;
const restoreBucket = `apdb-dst-${runId}`;
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apdb-storage-api-'));
const exportDir = path.join(root, 'export');
async function api(url, options = {}) { const response = await fetch(`${base}${url}`, options); if (!response.ok) throw new Error(`${response.status} ${await response.text()}`); return response; }
async function createBucket(id) { await api('/storage/v1/bucket', { method: 'POST', headers, body: JSON.stringify({ id, name: id, public: false }) }); }
async function removeBucket(id) { await fetch(`${base}/storage/v1/bucket/${id}`, { method: 'DELETE', headers }); }
async function upload(bucket, objectPath, data) { await api(`/storage/v1/object/${bucket}/${objectPath.split('/').map(encodeURIComponent).join('/')}`, { method: 'POST', headers: { ...headers, 'content-type': 'application/octet-stream', 'x-upsert': 'false' }, body: data }); }
(async () => {
  try {
    await createBucket(sourceBucket); await createBucket(restoreBucket);
    const objects = Array.from({ length: 1005 }, (_, index) => ({ path: `org-${index % 5}/nivel-${index % 7}/archivo-${index}.txt`, data: Buffer.from(`APDB STORAGE SYNTHETIC ${index}\n`) }));
    for (let index = 0; index < objects.length; index += 25) await Promise.all(objects.slice(index, index + 25).map(item => upload(sourceBucket, item.path, item.data)));
    const result = spawnSync(process.execPath, [path.resolve(__dirname, '..', 'tools', 'supabase-storage-backup.cjs')], { encoding: 'utf8', env: { ...process.env, APDB_STORAGE_API_URL: base, APDB_STORAGE_API_KEY: key, APDB_STORAGE_BUCKET: sourceBucket, APDB_STORAGE_RESTORE_API_URL: base, APDB_STORAGE_RESTORE_API_KEY: key, APDB_STORAGE_RESTORE_BUCKET: restoreBucket, APDB_STORAGE_EXPORT_DIR: exportDir } });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /APDB_SUPABASE_STORAGE_EXPORT_RESTORE_OK/);
    const manifest = JSON.parse(fs.readFileSync(path.join(exportDir, 'storage-api-manifest.json'), 'utf8'));
    assert.equal(manifest.objects.length, objects.length);
    console.log(`APDB_SUPABASE_STORAGE_BACKUP_INTEGRATION_OK source=${objects.length} exported=${manifest.objects.length} restored=${manifest.objects.length}`);
  } finally { await removeBucket(sourceBucket); await removeBucket(restoreBucket); fs.rmSync(root, { recursive: true, force: true }); }
})().catch(error => { console.error(`APDB_SUPABASE_STORAGE_BACKUP_INTEGRATION_FAILED ${error.message}`); process.exitCode = 1; });
