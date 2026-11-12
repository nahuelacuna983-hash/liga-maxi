const { test, expect } = require("@playwright/test");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(process.env.PRIVATE_PACKAGE_DIR || "private/apdb-2027-prueba-update-stage");
const contentTypes = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };

function startServer() {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const relative = pathname.replace(/^\/apdb-2027-prueba\/?/, "") || "index.html";
    const target = path.resolve(root, relative);
    if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
      response.writeHead(404);
      return response.end();
    }
    response.writeHead(200, { "content-type": contentTypes[path.extname(target)] || "application/octet-stream" });
    fs.createReadStream(target).pipe(response);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

test("paquete privado navega el circuito sintetico sin red externa", async ({ page }) => {
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const external = [];
  try {
    page.on("request", (request) => { if (!request.url().startsWith(base)) external.push(request.url()); });
    await page.goto(`${base}/apdb-2027-prueba/`, { waitUntil: "networkidle" });
    await expect(page.getByText("DATOS FICTICIOS - DEMOSTRACION NO OFICIAL.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Público" })).toBeVisible();
    await expect(page.getByText("Fixture actualizado")).toBeVisible();

    await page.locator("#circuit-category").selectOption("femenino");
    await page.getByRole("button", { name: "Asociación" }).click();
    await page.getByRole("button", { name: "Competencia" }).click();
    await page.getByRole("button", { name: "Generar o regenerar fixture" }).click();
    await expect(page.getByText("Fixture generado en memoria.")).toBeVisible();

    await page.getByRole("button", { name: "Playoffs", exact: false }).count();
    await page.getByRole("button", { name: "Simular campeonato completo" }).click();
    await expect(page.getByLabel("Campeón confirmado")).toBeVisible();
    await expect(page.getByLabel("Campeón confirmado")).toContainText("CAMPEÓN");
    expect(external).toEqual([]);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
