"use strict";
// Offline comparison of sanitized snapshots. No connection strings or data are accepted.
const fs = require("node:fs");
const crypto = require("node:crypto");
const [,, leftPath, rightPath] = process.argv;
if (!leftPath || !rightPath) throw new Error("Usage: node tools/apdb-compare-snapshots.cjs <source.json> <restore.json>");
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const normalize = (value) => {
  if (Array.isArray(value)) return `[${value.map(normalize).sort().join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${normalize(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
};
const source = read(leftPath), restore = read(rightPath);
const sections = ["tables", "relations", "indexes", "constraints", "policies", "functions", "extensions", "auth", "storage"];
const differences = [];
for (const section of sections) {
  const a = source[section] ?? [];
  const b = restore[section] ?? [];
  if (normalize(a) !== normalize(b)) differences.push(section);
}
const report = {
  sourceSha256: crypto.createHash("sha256").update(JSON.stringify(source)).digest("hex"),
  restoreSha256: crypto.createHash("sha256").update(JSON.stringify(restore)).digest("hex"),
  comparedSections: sections,
  differences,
  decision: differences.length ? "NO-GO" : "GO"
};
console.log(JSON.stringify(report));
if (differences.length) process.exitCode = 2;
