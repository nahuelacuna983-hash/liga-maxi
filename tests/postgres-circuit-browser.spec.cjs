const { test, expect } = require("@playwright/test");

const base = process.env.POSTGRES_UI_BASE_URL || "http://127.0.0.1:8787/demo_circuito_2027.html?mode=postgres";
test.skip(!process.env.POSTGRES_UI_BASE_URL, "Requiere PostgreSQL 16 y el backend HTTP levantado por CI.");

test("opera y recupera el circuito principal contra PostgreSQL", async ({ page }) => {
  const diagnostics = [];
  page.on("console", (message) => diagnostics.push(`console:${message.type()}:${message.text()}`));
  page.on("pageerror", (error) => diagnostics.push(`pageerror:${error.message}`));
  page.on("requestfailed", (request) => diagnostics.push(`requestfailed:${request.url()}:${request.failure()?.errorText}`));
  await page.goto(base);
  await expect(page.locator("#circuit-status")).toContainText("PostgreSQL local conectado");
  await page.getByRole("button", { name: "Asociación" }).click();
  await page.locator("#pg-tournament").fill("Browser PostgreSQL 2027");
  await page.locator("#pg-create-tournament").click();
  await page.locator("#pg-category").fill("Maxi +35 Browser");
  await page.locator("#pg-create-category").click();
  await expect(page.locator("#circuit-status")).toContainText("Categoría confirmada");
  await page.locator("#pg-add-team").click();
  await expect(page.locator("#circuit-status")).toContainText("nombre del equipo es obligatorio");
  for (const team of ["Browser A", "Browser B", "Browser C", "Browser D"]) {
    await page.locator("#pg-team").fill(team);
    await page.locator("#pg-add-team").click();
    await expect(page.locator("#pg-team-state")).toContainText(`Equipos persistidos: ${["Browser A", "Browser B", "Browser C", "Browser D"].indexOf(team) + 1}`);
  }
  await page.locator("#pg-fixture").click();
  await expect(page.locator("#circuit-status")).toContainText("Fixture confirmado");
  await expect(page.locator("#pg-match option")).toHaveCount(7);
  const matchId = await page.locator("#pg-match").inputValue();
  await page.locator("#pg-date").fill("2027-06-13T15:00");
  await page.locator("#pg-court").fill("Cancha Browser");
  const scheduleResponse = page.waitForResponse((response) => response.url().includes("/schedule") && response.request().method() === "POST");
  await page.locator("#pg-schedule").click();
  expect((await scheduleResponse).status()).toBe(200);
  await expect(page.locator("#circuit-status")).toContainText("Programación confirmada");
  await page.locator("#pg-local").fill("80");
  await page.locator("#pg-away").fill("70");
  const resultResponse = page.waitForResponse((response) => response.url().includes("/result") && response.request().method() === "POST");
  await page.locator("#pg-result").click();
  const result = await resultResponse;
  expect(result.status()).toBe(200);
  expect((await result.json()).home_score).toBe(80);
  await expect(page.locator("#circuit-status")).toContainText("Resultado confirmado");
  await page.getByRole("button", { name: "Público" }).click();
  await expect(page.locator("#view-public")).toContainText("80");
  await page.reload();
  await expect(page.locator("#circuit-status")).toContainText("PostgreSQL local conectado");
  await expect(page.locator("#view-public")).toContainText("80");
  expect(matchId).toBeTruthy();
  expect(diagnostics.filter((entry) => entry.startsWith("pageerror:") || entry.startsWith("requestfailed:")).join("\n")).toBe("");
});
