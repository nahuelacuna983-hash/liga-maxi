"use strict";
// Offline drill only. Never deploys, accesses hosting or changes Supabase.
// Verifies a release can be staged and a previous release restored with hashes intact.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {spawnSync}=require("node:child_process");
const crypto=require("node:crypto");
const root=fs.mkdtempSync(path.join(os.tmpdir(),"apdb-rollback-"));
const config=path.join(root,"config.json");
const packageDir=path.join(root,"candidate");
const live=path.join(root,"current");
const previous=path.join(root,"previous");
const staging=path.join(root,"incoming");
const verify=(dir)=>{
  const run=spawnSync(process.execPath,["tools/verify-apdb-release.cjs",dir],{encoding:"utf8"});
  assert.equal(run.status,0,run.stderr || run.stdout);
};
const fingerprint=(dir)=>{
  const files=fs.readdirSync(dir).sort();
  const digest=crypto.createHash("sha256");
  for(const name of files){digest.update(name);digest.update(fs.readFileSync(path.join(dir,name)));}
  return digest.digest("hex");
};
try{
  fs.writeFileSync(config,JSON.stringify({
    environment:"staging",
    supabaseUrl:"https://wffvmthdmmjwspnozyrv.supabase.co",
    supabaseAnonKey:"sb_publishable_test_only_0123456789",
    publicBasePath:"/apdb-2027-staging/",
    resetDatabaseOnStart:false
  }));
  const built=spawnSync(process.execPath,["tools/build-apdb-staging.cjs",config,packageDir],{encoding:"utf8"});
  assert.equal(built.status,0,built.stderr || built.stdout);
  fs.cpSync(packageDir,live,{recursive:true});
  verify(live);
  const original=fingerprint(live);
  // Candidate includes a modified publishable frontend artifact with its own integrity manifest.
  fs.cpSync(packageDir,staging,{recursive:true});
  const incomingJs=path.join(staging,"app_online.js");
  const update=fs.readFileSync(incomingJs);
  const updated=Buffer.concat([update,Buffer.from("\n// synthetic release marker\n")]);
  fs.writeFileSync(incomingJs,updated);
  const manifestPath=path.join(staging,"release-integrity.json");
  const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
  const entry=manifest.files.find(x=>x.file==="app_online.js");
  entry.bytes=updated.length;
  entry.sha256=crypto.createHash("sha256").update(updated).digest("hex");
  fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+"\n");
  verify(staging);
  assert.notEqual(fingerprint(staging),original,"Synthetic release must differ from original");
  // Same-filesystem moves: hold previous until the new package verifies.
  fs.renameSync(live,previous);
  fs.renameSync(staging,live);
  verify(live);
  assert.notEqual(fingerprint(live),original);
  // Recovery drill, no changes to any actual hosting path.
  fs.renameSync(live,staging);
  fs.renameSync(previous,live);
  verify(live);
  assert.equal(fingerprint(live),original,"Rollback bytes do not match original");
  console.log("APDB_OFFLINE_RELEASE_ROLLBACK_OK original_hash_restored=true");
}finally{fs.rmSync(root,{recursive:true,force:true});}
