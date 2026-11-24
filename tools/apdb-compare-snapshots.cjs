"use strict";
// Offline comparison of independently collected SANITIZED snapshots.
// Explicit required sections, no default empty arrays: otherwise two missing inventories could give false GO.
const fs = require("node:fs");
const crypto = require("node:crypto");
const [,, leftPath, rightPath] = process.argv;
if (!leftPath || !rightPath) {
  console.error("APDB_SNAPSHOT_INVALID missing source/destination paths");
  process.exit(1);
}
const sections = ["tables", "relations", "indexes", "constraints", "policies", "functions", "extensions", "auth", "storage"];
const arrays = new Set(["tables", "relations", "indexes", "constraints", "policies", "functions", "extensions"]);
function reject(message) { throw new Error("APDB_SNAPSHOT_INVALID " + message); }
function read(file) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!data || typeof data !== "object" || Array.isArray(data)) reject("snapshot must be an object");
  for (const section of sections) {
    if (!Object.prototype.hasOwnProperty.call(data, section)) reject("missing section " + section);
    const value = data[section];
    if (arrays.has(section)) {
      if (!Array.isArray(value)) reject("expected array " + section);
    } else if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length === 0) {
      reject("expected nonempty metadata object " + section);
    }
  }
  if (data.tables.length === 0) reject("table inventory is empty");
  if (data.extensions.length === 0) reject("extension inventory is empty");
  return data;
}
const normalize = (value) => {
  if (Array.isArray(value)) return "[" + value.map(normalize).sort().join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + normalize(value[key])).join(",") + "}";
  return JSON.stringify(value);
};
try {
  const source = read(leftPath), restore = read(rightPath);
  const differences = [];
  for (const section of sections) {
    if (normalize(source[section]) !== normalize(restore[section])) differences.push(section);
  }
  const report = {
    sourceSha256: crypto.createHash("sha256").update(JSON.stringify(source)).digest("hex"),
    restoreSha256: crypto.createHash("sha256").update(JSON.stringify(restore)).digest("hex"),
    comparedSections: sections,
    differences,
    decision: differences.length ? "NO-GO" : "GO-SANITIZED-SNAPSHOT-ONLY",
    limitation: "This only compares supplied metadata, not underlying database rows or actual Auth/Storage bytes."
  };
  console.log(JSON.stringify(report));
  if (differences.length) process.exitCode = 2;
} catch (e) {
  console.error(/^APDB_SNAPSHOT_INVALID/.test(e.message) ? e.message : "APDB_SNAPSHOT_INVALID unreadable or malformed input");
  process.exitCode = 1;
}
