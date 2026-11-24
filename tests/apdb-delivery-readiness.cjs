"use strict";
const assert=require("node:assert/strict");
const {validate, requiredCI, requiredReal}=require("../tools/apdb-delivery-readiness.cjs");
const sha="b3fcf823d24ce65423bc3bff5c1e9067f0d5e38b";
const ciRuns={release_package:45502845427,pg17_synthetic_restore:45502845701,staging_differential_synthetic:45502845314,document_guardrails:45502845406};
const example=()=>({
  format:"apdb-handoff-evidence-v1",
  candidate_sha:sha,
  ci:Object.fromEntries(requiredCI.map(k=>[k,{status:"pass",commit_sha:sha,url:"https://github.com/nahuelacuna983-hash/liga-maxi/actions/runs/"+ciRuns[k]}])),
  real:Object.fromEntries(requiredReal.map(k=>[k,{status:"pending"}]))
});
const a=validate(example());
assert.equal(a.planning,"GO");
assert.equal(a.publication,"NO-GO");
assert.equal(a.missingForPublication.length,6);
const b=example();
b.ci.release_package.commit_sha="0".repeat(40);
assert.throws(()=>validate(b),/CI SHA mismatch/);
const c=example();
c.real.real_backup_restore.status="pass";
assert.throws(()=>validate(c),/PASS without an audit reference/);
const d=example();
for(const k of requiredReal)d.real[k]={status:"pass",evidence_reference:"acta-privada-2026-11-24"};
assert.equal(validate(d).publication,"GO-REQUIRES_SEPARATE_OPERATOR_ACTION");
const e=example();
e.ci.document_guardrails.status="fail";
assert.equal(validate(e).planning,"NO-GO");
const f=example();
f.ci.pg17_synthetic_restore.url="https://evil.example/runs/1";
assert.throws(()=>validate(f),/Invalid CI evidence URL/);
console.log("APDB_HANDOFF_READINESS_CONTRACT_OK synthetic_only=true");
