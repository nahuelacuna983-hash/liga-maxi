const { test, expect } = require("@playwright/test");

const base = process.env.POSTGRES_UI_BASE_URL || "http://127.0.0.1:8787/demo_circuito_2027.html?mode=postgres";
test.skip(!process.env.POSTGRES_UI_BASE_URL, "Requiere PostgreSQL 16 y el backend HTTP levantado por CI.");

async function saveResult(page, select, local, away) {
  await page.locator(select).selectOption({ index: 1 });
  await page.locator("#pg-playoff-local").fill(String(local));
  await page.locator("#pg-playoff-away").fill(String(away));
  await page.locator("#pg-playoff-result").click();
  await expect(page.locator("#circuit-status")).toContainText("Resultado de playoff confirmado");
}

test("completa un campeonato Top 4 y recupera el campeón desde PostgreSQL", async ({ page }) => {
  const diagnostics = [];
  page.on("console", (message) => diagnostics.push(`console:${message.type()}:${message.text()}`));
  page.on("pageerror", (error) => diagnostics.push(`pageerror:${error.message}`));
  page.on("requestfailed", (request) => diagnostics.push(`requestfailed:${request.url()}:${request.failure()?.errorText}`));
  await page.goto(base);
  await expect(page.locator("#circuit-status")).toContainText("PostgreSQL local conectado");
  await page.getByRole("button", { name: "Asociación" }).click();
  await page.locator("#pg-tournament").fill("Campeonato persistente Top 4");
  const tournamentResponse = page.waitForResponse((item) => item.url().endsWith("/api/tournaments") && item.request().method() === "POST");
  await page.locator("#pg-create-tournament").click();
  expect((await tournamentResponse).status()).toBe(201);
  await expect(page.locator("#circuit-status")).toContainText("Torneo confirmado");
  await page.locator("#pg-category").fill("Maxi +35 Persistente");
  const categoryResponse = page.waitForResponse((item) => item.url().endsWith("/api/categories") && item.request().method() === "POST");
  await page.locator("#pg-create-category").click();
  expect((await categoryResponse).status()).toBe(201);
  await expect(page.locator("#circuit-status")).toContainText("Categoría confirmada");
  for (const team of ["Persistente A", "Persistente B", "Persistente C", "Persistente D"]) {
    await page.locator("#pg-team").fill(team);
    const teamResponse = page.waitForResponse((item) => item.url().endsWith("/api/teams") && item.request().method() === "POST");
    await page.locator("#pg-add-team").click();
    expect((await teamResponse).status()).toBe(201);
    await expect(page.locator("#circuit-status")).toContainText("Equipo confirmado");
    await expect(page.locator("#pg-team-state")).toContainText(`Equipos persistidos: ${["Persistente A", "Persistente B", "Persistente C", "Persistente D"].indexOf(team) + 1}`);
  }
  const fixtureResponse = page.waitForResponse((item) => item.url().endsWith("/api/fixtures") && item.request().method() === "POST");
  await page.locator("#pg-fixture").click();
  expect((await fixtureResponse).status()).toBe(201);
  await expect(page.locator("#circuit-status")).toContainText("Fixture confirmado");
  await expect(page.locator("#pg-match option")).toHaveCount(7);
  for (let index = 1; index <= 6; index += 1) {
    await page.locator("#pg-match").selectOption({ index });
    await page.locator("#pg-local").fill(String(80 + index));
    await page.locator("#pg-away").fill(String(70 + index));
    const response = page.waitForResponse((item) => item.url().includes("/result") && item.request().method() === "POST");
    await page.locator("#pg-result").click();
    expect((await response).status()).toBe(200);
    await expect(page.locator("#circuit-status")).toContainText("Resultado confirmado");
  }
  await expect(page.locator("#view-association")).toContainText("Equipos persistidos: 4");
  await page.getByRole("button", { name: "Público" }).click();
  await expect(page.locator("#view-public")).toContainText("Persistente A");
  await page.getByRole("button", { name: "Asociación" }).click();
  await page.locator("#pg-playoff-top").selectOption("4");
  await page.locator("#pg-playoff-generate").click();
  await expect(page.locator("#circuit-status")).toContainText("Playoffs confirmados");
  await expect(page.locator("#pg-playoff-match option")).toHaveCount(3);
  await saveResult(page, "#pg-playoff-match", 78, 70);
  await saveResult(page, "#pg-playoff-match", 76, 69);
  await page.locator("#pg-playoff-advance").click();
  await expect(page.locator("#circuit-status")).toContainText("Avance de playoff confirmado");
  await expect(page.locator("#pg-playoff-match option")).toHaveCount(2);
  await saveResult(page, "#pg-playoff-match", 82, 74);
  await page.locator("#pg-playoff-advance").click();
  await expect(page.locator("#pg-playoff-state")).toContainText("Campeón:");
  const championBeforeReload = await page.locator("#pg-playoff-state").textContent();
  await page.reload();
  await expect(page.locator("#circuit-status")).toContainText("PostgreSQL local conectado");
  await page.getByRole("button", { name: "Asociación" }).click();
  await expect(page.locator("#pg-playoff-state")).toContainText("Campeón:");
  expect(await page.locator("#pg-playoff-state").textContent()).toContain(championBeforeReload.match(/Campeón:[^\n]+/)?.[0] || "Campeón:");
  expect(diagnostics.filter((entry) => entry.startsWith("pageerror:") || entry.startsWith("requestfailed:")).join("\n")).toBe("");
});
