"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const root = path.resolve(process.argv[2] || "");
if (!root || !fs.existsSync(path.join(root, "index.html"))) throw new Error("Uso: node tests/institutional-package-subpath.cjs <directorio-extraido>");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
const server = http.createServer((request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  if (!url.pathname.startsWith("/apdb-2027-prueba/")) { response.writeHead(404); return response.end(); }
  const relative = decodeURIComponent(url.pathname.slice("/apdb-2027-prueba/".length) || "index.html");
  const target = path.resolve(root, relative);
  if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) { response.writeHead(404); return response.end(); }
  response.writeHead(200, { "content-type": types[path.extname(target).toLowerCase()] || "application/octet-stream" });
  fs.createReadStream(target).pipe(response);
});
function get(base, route) { return new Promise((resolve, reject) => { http.get(`${base}${route}`, (response) => { let text = ""; response.on("data", (chunk) => { text += chunk; }); response.on("end", () => resolve({ response, text })); }).on("error", reject); }); }
(async () => { await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve)); const base = `http://127.0.0.1:${server.address().port}`; try {
  const html = await get(base, "/apdb-2027-prueba/"); assert.equal(html.response.statusCode, 200); assert.match(html.text, /app_online\.js/); assert.match(html.text, /manifest\.json/); assert.match(html.text, /sw\.js/);
  for (const resource of ["app_online.js", "style.css", "manifest.json", "sw.js", "icon-192.png", "icon-512.png"]) assert.equal((await get(base, `/apdb-2027-prueba/${resource}`)).response.statusCode, 200, resource);
  const manifest = JSON.parse((await get(base, "/apdb-2027-prueba/manifest.json")).text); assert.equal(manifest.start_url, "./"); assert.equal(manifest.scope, "./");
  console.log("INSTITUTIONAL_PACKAGE_SUBPATH_OK");
} finally { await new Promise((resolve) => server.close(resolve)); } })().catch((error) => { console.error(error); process.exitCode = 1; });
