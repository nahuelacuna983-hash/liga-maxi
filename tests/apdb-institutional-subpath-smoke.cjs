"use strict";
// A real HTTP subpath smoke for the OFFICIAL staging package (not the old offline demo).
// No hosted API calls, credentials or external network needed.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const basePath = "/apdb-2027-prueba/";
const project = "wffvmthdmmjwspnozyrv";
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "apdb-subpath-smoke-"));
const configFile = path.join(temp, "config.json");
const site = path.join(temp, "site");
const config = {
  environment: "staging",
  supabaseUrl: `https://${project}.supabase.co`,
  supabaseAnonKey: "sb_publishable_synthetic_test_0123456789",
  publicBasePath: basePath,
  resetDatabaseOnStart: false
};
const mime = {
  ".html": "text/html", ".js": "text/javascript",
  ".json": "application/json", ".png": "image/png"
};
const server = http.createServer((request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  if (!url.pathname.startsWith(basePath)) {
    response.writeHead(404); response.end(); return;
  }
  const relative = decodeURIComponent(url.pathname.slice(basePath.length) || "index.html");
  const resolved = path.resolve(site, relative);
  if (!resolved.startsWith(site + path.sep) || !fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
    response.writeHead(404); response.end(); return;
  }
  response.writeHead(200, { "content-type": mime[path.extname(resolved)] || "application/octet-stream", "cache-control": "no-store" });
  fs.createReadStream(resolved).pipe(response);
});

function request(route) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${server.address().port}${route}`, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({ status: response.statusCode, body: Buffer.concat(chunks) }));
    }).on("error", reject);
  });
}

(async () => {
  try {
    fs.writeFileSync(configFile, JSON.stringify(config));
    const built = spawnSync(process.execPath, ["tools/build-apdb-staging.cjs", configFile, site], { encoding: "utf8" });
    assert.equal(built.status, 0, `Official staging package failed: ${built.stderr || built.stdout}`);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const root = await request(basePath);
    assert.equal(root.status, 200, "institutional subpath root did not return index.html");
    const html = root.body.toString("utf8");
    assert.equal(html, (await request(`${basePath}index_online.html`)).body.toString("utf8"));
    assert.match(html, /window\.APDB_STAGING=true/);
    assert.match(html, /window\.APDB_SUPABASE_URL="https:\/\/wffvmthdmmjwspnozyrv\.supabase\.co"/);
    assert.match(html, /apdb-administrative-adapter\.js/);
    assert.match(html, /app_online\.js/);
    assert.doesNotMatch(html, /demo_circuito_2027|eshbydpsmypflfxpmhyk/);
    const manifest = JSON.parse((await request(`${basePath}manifest.json`)).body.toString("utf8"));
    assert.equal(manifest.start_url, basePath);
    assert.equal(manifest.scope, basePath);
    const assets = [
      "app_online.js", "apdb-administrative-adapter.js",
      "sw.js", "manifest.json", "icon-192.png", "icon-512.png"
    ];
    for (const asset of assets) {
      const response = await request(`${basePath}${asset}`);
      assert.equal(response.status, 200, `missing asset ${asset}`);
      assert.ok(response.body.length > 0, `empty asset ${asset}`);
    }
    const app = (await request(`${basePath}app_online.js`)).body.toString("utf8");
    assert.match(app, /APP_CONFIG\.organizacionActiva\.storageSlug = organizacion\.slug/);
    assert.match(app, /if \(!torneo && TORNEO_ID_FALLBACK\)/);
    assert.doesNotMatch(app, /eshbydpsmypflfxpmhyk|7d0971e3-66ee-4791-bcbf-bace1d2fefb9/);
    assert.equal((await request("/")).status, 404);
    assert.equal((await request(`${basePath}../main/index.html`)).status, 404);
    console.log("APDB_INSTITUTIONAL_SUBPATH_HTTP_OK root=true assets=6 scope=private staging_only=true");
  } finally {
    if (server.listening) await new Promise((resolve) => server.close(resolve));
    fs.rmSync(temp, { recursive: true, force: true });
  }
})().catch((e) => { console.error(`APDB_INSTITUTIONAL_SUBPATH_HTTP_FAILED ${e.message}`); process.exitCode = 1; });
