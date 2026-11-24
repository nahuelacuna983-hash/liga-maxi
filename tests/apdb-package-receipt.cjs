"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const crypto=require("node:crypto");
const {spawnSync}=require("node:child_process");
const {prepare}=require("../tools/apdb-package-receipt.cjs");
const root=fs.mkdtempSync(path.join(os.tmpdir(),"apdb-receipt-test-"));
const pkg=path.join(root,"package"),config=path.join(root,"config.json"),receipt=path.join(root,"receipt");
const sha="b3fcf823d24ce65423bc3bff5c1e9067f0d5e38b";
try {
  fs.writeFileSync(config,JSON.stringify({
    environment:"staging",supabaseUrl:"https://wffvmthdmmjwspnozyrv.supabase.co",
    supabaseAnonKey:"sb_publishable_test_only_0123456789",publicBasePath:"/apdb-2027-prueba/",
    resetDatabaseOnStart:false
  }));
  let r=spawnSync(process.execPath,["tools/build-apdb-staging.cjs",config,pkg],{encoding:"utf8"});
  assert.equal(r.status,0,r.stderr||r.stdout);
  const output=prepare(pkg,receipt,sha);
  assert.equal(output.fileCount,9);
  assert.match(output.fingerprint,/^[0-9a-f]{64}$/);
  const report=JSON.parse(fs.readFileSync(path.join(receipt,"APDB-RELEASE-RECEIPT.json"),"utf8"));
  assert.equal(report.status,"PREPARED_ONLY_NOT_DEPLOYED");
  assert.equal(report.commit_sha,sha);
  assert.equal(report.files.length,9);
  assert.ok(!JSON.stringify(report).includes("sb_publishable_test_only"));
  assert.ok(!JSON.stringify(report).includes("supabase.co"));
  assert.throws(()=>prepare(pkg,receipt,sha),/exists/);
  assert.throws(()=>prepare(pkg,path.join(pkg,"receipt"),sha),/public package/);
  assert.throws(()=>prepare(pkg,path.join(root,"another"),"bad"),/commit SHA/);
  fs.appendFileSync(path.join(pkg,"app_online.js"),"\n// changed after receipt\n");
  assert.throws(()=>prepare(pkg,path.join(root,"tampered"),sha),/integrity/);
  console.log("APDB_PRIVATE_HANDOFF_RECEIPT_CONTRACT_OK negative_cases=4");
} finally { fs.rmSync(root,{recursive:true,force:true}); }
