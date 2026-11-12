"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(process.argv[2] || "private/apdb-2027-prueba-update-stage");
assert.ok(fs.existsSync(path.join(root, "index.html")), `package directory missing: ${root}`);
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file); else files.push(file);
  }
}
walk(root);
assert.equal(files.some((file) => path.basename(file).toLowerCase() === ".htaccess"), false);
assert.equal(files.some((file) => /\.(sql|bak|backup|dump)$/i.test(file)), false);
for (const file of files) {
  if (!/\.(html|js|json|css|txt)$/i.test(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  assert.doesNotMatch(text, /eshbydpsmypflfxpmhyk|service_role|sb_secret|DATABASE_URL|PGPASSWORD/i, file);
}
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.match(html, /apdb-private-config\.js/);
assert.match(html, /operaciones persistentes/);
const app = fs.readFileSync(path.join(root, "app_online.js"), "utf8");
assert.match(app, /APDB_SUPABASE_URL \|\| ""/);
const config = fs.readFileSync(path.join(root, "apdb-private-config.js"), "utf8");
assert.match(config, /mode: "offline"/);
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
assert.equal(manifest.scope, "./");
assert.equal(manifest.start_url, "./");
assert.ok(fs.existsSync(path.join(root, "sw.js")), "service worker missing");
console.log(`APDB_PRIVATE_PACKAGE_SAFETY_OK files=${files.length}`);
