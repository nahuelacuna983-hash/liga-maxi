"use strict";
// Browser-level check of the packaged institutional shell. The official app is
// loaded with scripts disabled here so this test never contacts Supabase; the
// synthetic operational flows remain covered by demo-circuit-browser.spec.cjs.
const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { spawnSync } = require("node:child_process");

const basePath = "/apdb-2027-prueba/";
const files = new Set(["", "index.html", "index_online.html", "app_online.js", "apdb-administrative-adapter.js", "manifest.json", "sw.js", "release-integrity.json", "icon-192.png", "icon-512.png"]);

function build() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "apdb-institutional-browser-"));
  const config = path.join(dir, "config.json");
  const site = path.join(dir, "site");
  fs.writeFileSync(config, JSON.stringify({
    environment: "staging",
    supabaseUrl: "https://wffvmthdmmjwspnozyrv.supabase.co",
    supabaseAnonKey: "sb_publishable_test_only_0123456789",
    publicBasePath: basePath,
    resetDatabaseOnStart: false
  }));
  const result = spawnSync(process.execPath, ["tools/build-apdb-staging.cjs", config, site], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return { dir, site };
}

async function serve(site) {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    if (!pathname.startsWith(basePath)) return response.writeHead(404).end();
    const relative = pathname.slice(basePath.length);
    const file = relative === "" ? "index.html" : relative;
    if (!files.has(relative) || !fs.existsSync(path.join(site, file))) return response.writeHead(404).end();
    response.writeHead(200, { "content-type": file.endsWith(".js") ? "text/javascript" : file.endsWith(".json") ? "application/json" : "text/html", "cache-control": "no-store" });
    fs.createReadStream(path.join(site, file)).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}${basePath}` };
}

for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }]) {
  test(`paquete institucional navegable en ${viewport.name}`, async ({ browser }) => {
    const built = build();
    const running = await serve(built.site);
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, javaScriptEnabled: false });
    try {
      const response = await page.goto(running.url, { waitUntil: "domcontentloaded" });
      expect(response.status()).toBe(200);
      await expect(page.getByRole("button", { name: "Público" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Delegados" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Asociación" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
      await page.screenshot({ path: `test-results/apdb-institutional-${viewport.name}.png`, fullPage: true });
    } finally {
      await page.close();
      await new Promise((resolve) => running.server.close(resolve));
      fs.rmSync(built.dir, { recursive: true, force: true });
    }
  });
}
