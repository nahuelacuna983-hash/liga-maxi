"use strict";
// Read-only acceptance gate. Never fetches remote data or handles credentials.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const requiredCI = [
  "release_package", "pg17_synthetic_restore", "staging_differential_synthetic", "document_guardrails"
];
const requiredReal = [
  "real_backup_restore", "auth_storage_validation", "hosted_protected_pilot",
  "three_roles_acceptance", "rollback_rehearsed_on_host", "explicit_publication_approval"
];
const phases = { "pending": 0, "pass": 1, "fail": -1 };
function check(cond, message) { if (!cond) throw new Error(message); }
function validate(data) {
  check(data && typeof data === "object" && !Array.isArray(data), "Evidence must be an object");
  check(data.format === "apdb-handoff-evidence-v1", "Unsupported evidence format");
  check(typeof data.candidate_sha === "string" && /^[a-f0-9]{40}$/.test(data.candidate_sha), "Missing exact 40-char candidate SHA");
  check(data.ci && typeof data.ci === "object" && !Array.isArray(data.ci), "Missing CI evidence");
  check(data.real && typeof data.real === "object" && !Array.isArray(data.real), "Missing real-environment evidence");
  const source = {};
  for (const key of requiredCI) {
    const e = data.ci[key];
    check(e && Object.prototype.hasOwnProperty.call(phases, e.status), "Missing/invalid CI status: " + key);
    if (e.status === "pass") {
      check(e.commit_sha === data.candidate_sha, "CI SHA mismatch: " + key);
      check(typeof e.url === "string" && /^https:\/\/github\.com\/nahuelacuna983-hash\/liga-maxi\/actions\/runs\/[0-9]+$/.test(e.url), "Invalid CI evidence URL: " + key);
    }
    source[key] = e.status;
  }
  for (const key of requiredReal) {
    const e = data.real[key];
    check(e && Object.prototype.hasOwnProperty.call(phases, e.status), "Missing/invalid real status: " + key);
    check(e.status !== "pass" || (typeof e.evidence_reference === "string" && /^[A-Za-z0-9_./: #()-]{6,200}$/.test(e.evidence_reference)), "PASS without an audit reference: " + key);
    source[key] = e.status;
  }
  const readyToPlan = requiredCI.every(key => source[key] === "pass");
  const readyToPublish = readyToPlan && requiredReal.every(key => source[key] === "pass");
  return {
    candidate_sha: data.candidate_sha,
    planning: readyToPlan ? "GO" : "NO-GO",
    publication: readyToPublish ? "GO-REQUIRES_SEPARATE_OPERATOR_ACTION" : "NO-GO",
    ci: Object.fromEntries(requiredCI.map(k => [k, source[k]])),
    real: Object.fromEntries(requiredReal.map(k => [k, source[k]])),
    missingForPlanning: requiredCI.filter(k => source[k] !== "pass"),
    missingForPublication: requiredReal.filter(k => source[k] !== "pass"),
    note: "Evidence is operator-entered and not authenticated by this offline tool. Publication requires explicit human authorization; this tool never deploys."
  };
}
if (require.main === module) {
  try {
    check(process.argv.length === 3, "Usage: node tools/apdb-delivery-readiness.cjs <evidence.json>");
    const file = path.resolve(process.argv[2]);
    const raw = fs.readFileSync(file);
    // Never print input/evidence fields or credentials, even on validation errors.
    check(raw.length < 100000, "Evidence too large");
    const report = validate(JSON.parse(raw.toString("utf8")));
    console.log(JSON.stringify(report,null,2));
    process.exitCode = report.planning === "GO" ? 0 : 2;
  } catch (error) {
    console.error("APDB_HANDOFF_GATE_INVALID " + error.message);
    process.exitCode = 1;
  }
}
module.exports = { validate,requiredCI,requiredReal };
