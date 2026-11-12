#!/usr/bin/env node
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const source = path.resolve(process.env.APDB_STORAGE_SOURCE || '');
const target = path.resolve(process.env.APDB_STORAGE_TARGET || '');
const manifestPath = path.resolve(process.env.APDB_STORAGE_MANIFEST || path.join(target, 'storage-manifest.json'));
if (!source || !target || source === path.parse(source).root || target === path.parse(target).root) throw new Error('APDB_STORAGE_SOURCE and APDB_STORAGE_TARGET are required');
if (source === target) throw new Error('storage source and target must be different');
function files(root) {
  const output = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else output.push(path.relative(root, full).replaceAll('\\', '/'));
    }
  }
  walk(root);
  return output.sort();
}
function inventory(root) {
  return files(root).map(relative => {
    const file = path.join(root, relative);
    const data = fs.readFileSync(file);
    return { path: relative, bytes: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex') };
  });
}
function copy(root, destination) {
  for (const relative of files(root)) {
    const output = path.join(destination, relative);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.copyFileSync(path.join(root, relative), output);
  }
}
if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) throw new Error('storage source must be a directory');
fs.mkdirSync(target, { recursive: true });
const before = inventory(source);
copy(source, target);
const after = inventory(target);
assert.deepEqual(after, before, 'restored storage inventory differs from source');
const manifest = { generatedAt: new Date().toISOString(), source: 'synthetic-local-storage', target: 'synthetic-local-storage-restore', files: before, comparison: 'equal: relative paths, byte sizes and SHA-256' };
fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ marker: 'APDB_STORAGE_BACKUP_RESTORE_OK', manifest: manifestPath, files: before.length }));
