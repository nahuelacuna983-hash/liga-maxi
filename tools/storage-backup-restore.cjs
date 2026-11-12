#!/usr/bin/env node
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const rawSource = process.env.APDB_STORAGE_SOURCE;
const rawTarget = process.env.APDB_STORAGE_TARGET;
if (!rawSource || !rawTarget) throw new Error('APDB_STORAGE_SOURCE and APDB_STORAGE_TARGET are required');
const source = path.resolve(rawSource);
const target = path.resolve(rawTarget);
const manifestPath = path.resolve(process.env.APDB_STORAGE_MANIFEST || path.join(target, 'storage-manifest.json'));
const repoRoot = path.resolve(__dirname, '..');
function isWithin(parent, child) { return child === parent || child.startsWith(`${parent}${path.sep}`); }
function assertSafeDirectory(name, directory) {
  if (directory === path.parse(directory).root) throw new Error(`${name} cannot be a filesystem root`);
  if (isWithin(repoRoot, directory)) throw new Error(`${name} cannot be inside the repository`);
  if (isWithin(directory, repoRoot)) throw new Error(`${name} cannot contain the repository`);
}
assertSafeDirectory('APDB_STORAGE_SOURCE', source);
assertSafeDirectory('APDB_STORAGE_TARGET', target);
if (source === target) throw new Error('storage source and target must be different');
if (isWithin(source, target) || isWithin(target, source)) throw new Error('storage source and target cannot be nested');
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
if (fs.existsSync(target) && fs.readdirSync(target).length > 0 && process.env.APDB_STORAGE_ALLOW_NONEMPTY !== '1') throw new Error('storage target is not empty; use a new directory or explicitly set APDB_STORAGE_ALLOW_NONEMPTY=1');
fs.mkdirSync(target, { recursive: true });
const before = inventory(source);
copy(source, target);
const after = inventory(target);
assert.deepEqual(after, before, 'restored storage inventory differs from source');
const manifest = { generatedAt: new Date().toISOString(), source: 'synthetic-local-storage', target: 'synthetic-local-storage-restore', files: before, comparison: 'equal: relative paths, byte sizes and SHA-256' };
fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ marker: 'APDB_STORAGE_BACKUP_RESTORE_OK', manifest: manifestPath, files: before.length }));
