"use strict";
// Offline only. Source is pinned and clean; operator attests configuration provenance.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
function validate(c) {
  assert.deepEqual(Object.keys(c).sort(), ['environment','publicBasePath','resetDatabaseOnStart','supabaseAnonKey','supabaseUrl'].sort(), 'Only approved configuration fields allowed');
  assert.equal(c.environment, 'staging');
  assert.equal(c.resetDatabaseOnStart, false);
  assert.equal(c.publicBasePath, '/apdb-2027-prueba/');
  assert.equal(c.supabaseUrl, 'https://wffvmthdmmjwspnozyrv.supabase.co');
  assert.match(c.supabaseAnonKey, /^sb_publishable_[A-Za-z0-9_-]{20,}$/);
  assert.doesNotMatch(c.supabaseAnonKey, /test|example|placeholder|dummy|synthetic|YOUR_|secret|service_role|eyJ|HtooEUIqEorzX3ODPOwLXQ_iulhXEdL/i);
}
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) { crc ^= byte; for (let i=0;i<8;i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
// ZIP STORE, sorted ASCII names, fixed 1980-01-01, no host metadata or timestamps.
function zip(directory) {
  const chunks=[], central=[]; let offset=0;
  for (const file of fs.readdirSync(directory).sort()) {
    assert.match(file, /^[A-Za-z0-9_.-]+$/);
    assert.ok(fs.lstatSync(path.join(directory,file)).isFile());
    const name=Buffer.from(file), data=fs.readFileSync(path.join(directory,file)), crc=crc32(data);
    const local=Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20,4);
    local.writeUInt16LE(33,12); local.writeUInt32LE(crc,14); local.writeUInt32LE(data.length,18);
    local.writeUInt32LE(data.length,22); local.writeUInt16LE(name.length,26);
    const entry=Buffer.alloc(46); entry.writeUInt32LE(0x02014b50); entry.writeUInt16LE(20,4); entry.writeUInt16LE(20,6);
    entry.writeUInt16LE(33,14); entry.writeUInt32LE(crc,16); entry.writeUInt32LE(data.length,20);
    entry.writeUInt32LE(data.length,24); entry.writeUInt16LE(name.length,28); entry.writeUInt32LE(offset,42);
    chunks.push(local,name,data); central.push(entry,name); offset += local.length+name.length+data.length;
  }
  const end=Buffer.alloc(22), count=central.length/2;
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(count,8); end.writeUInt16LE(count,10);
  end.writeUInt32LE(central.reduce((n,b)=>n+b.length,0),12); end.writeUInt32LE(offset,16);
  return Buffer.concat([...chunks,...central,end]);
}
function run(command,args) {
  const result=cp.spawnSync(command,args,{cwd:repo,encoding:'utf8'});
  assert.equal(result.status,0,'Local release step failed');
  return result.stdout.trim();
}
function outsideRepo(p) {
  const rel=path.relative(repo,p);
  assert.ok(rel && (rel.startsWith('..'+path.sep) || path.isAbsolute(rel)), 'Private inputs/output must be outside repository');
}
function prepare(configFile, output, expectedCommit, approvedConfigHash) {
  assert.match(expectedCommit,/^[a-f0-9]{40}$/);
  assert.match(approvedConfigHash,/^[a-f0-9]{64}$/);
  assert.equal(run('git',['rev-parse','HEAD']),expectedCommit,'Source SHA mismatch');
  assert.equal(run('git',['status','--porcelain','--untracked-files=all']),'','Source must be clean');
  const configPath=fs.realpathSync(configFile); outsideRepo(configPath);
  const bytes=fs.readFileSync(configPath);
  assert.equal(hash(bytes),approvedConfigHash,'Approved configuration hash mismatch');
  const config=JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,'')); validate(config);
  const destination=path.resolve(output);
  assert.ok(!fs.existsSync(destination),'New output directory required');
  // Resolve existing parent to reject symlink/junction aliases into the repository.
  const parent=fs.realpathSync(path.dirname(destination)); outsideRepo(parent);
  const target=path.join(parent,path.basename(destination));
  fs.mkdirSync(target);
  const pkg=path.join(target,'package');
  // Normalize BOM/line endings privately; only the nine generated files go in ZIP.
  const normalized=path.join(target,'build-config.json');
  const source=path.join(target,'source'); fs.mkdirSync(source);
  const sourceFiles=['index_online.html','app_online.js','apdb-administrative-adapter.js','sw.js','manifest.json','icon-192.png','icon-512.png'];
  try {
    fs.writeFileSync(normalized,JSON.stringify(config),{flag:'wx',mode:0o600});
    // Build canonical committed bytes, independent of checkout CRLF settings.
    for (const file of [...sourceFiles,'build-apdb-staging.cjs']) {
      const gitPath=file==='build-apdb-staging.cjs'?'tools/'+file:file;
      const result=cp.spawnSync('git',['show',expectedCommit+':'+gitPath],{cwd:repo,maxBuffer:16*1024*1024});
      assert.equal(result.status,0,'Unable to read committed source');
      fs.writeFileSync(path.join(source,file),result.stdout,{flag:'wx'});
    }
    const build=cp.spawnSync(process.execPath,[path.join(source,'build-apdb-staging.cjs'),normalized,pkg],{cwd:source,encoding:'utf8'});
    assert.equal(build.status,0,'Canonical build failed');
    run(process.execPath,['tools/verify-apdb-release.cjs',pkg]);
    run(process.execPath,['tools/apdb-package-receipt.cjs',pkg,path.join(target,'receipt'),expectedCommit]);
    const archive=zip(pkg); const name='apdb-2027-prueba.zip';
    fs.writeFileSync(path.join(target,name),archive,{flag:'wx'});
    const report={status:'PREPARED_ONLY_NOT_INSTALLED',commit_sha:expectedCommit,configuration_sha256:approvedConfigHash,
      zip:name,bytes:archive.length,sha256:hash(archive),files:9,
      configuration_provenance:'operator-attested; key/project association not verified online'};
    fs.writeFileSync(path.join(target,'receipt','ZIP-RECEIPT.json'),JSON.stringify(report,null,2)+'\n');
    fs.writeFileSync(path.join(target,'receipt','SHA256SUMS'),hash(archive)+'  '+name+'\n');
    return report;
  } finally {
    fs.rmSync(normalized,{force:true});
    for (const file of [...sourceFiles,'build-apdb-staging.cjs']) fs.rmSync(path.join(source,file),{force:true});
    fs.rmdirSync(source);
  }
}
if(require.main===module) {
  try { assert.equal(process.argv.length,6); console.log(JSON.stringify(prepare(...process.argv.slice(2)),null,2)); }
  catch { console.error('APDB_CPANEL_PREPARATION_FAILED: check clean SHA, approved config/hash and new private output path; no deployment performed'); process.exitCode=1; }
}
module.exports={validate,zip,crc32,prepare};
