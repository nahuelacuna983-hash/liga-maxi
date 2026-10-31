const { test, expect } = require("@playwright/test");

const base = process.env.POSTGRES_UI_BASE_URL || "http://127.0.0.1:8787/demo_circuito_2027.html?mode=postgres";
test.skip(!process.env.POSTGRES_UI_BASE_URL, "Requiere PostgreSQL 16 y el backend HTTP levantado por CI.");

test("opera y recupera el circuito principal contra PostgreSQL", async ({ page }) => {
  await page.goto(base);
  await expect(page.locator("#circuit-status")).toContainText("PostgreSQL local conectado");
  await page.getByRole("button", { name: "Asociación" }).click();
  await page.locator("#pg-tournament").fill("Browser PostgreSQL 2027");
  await page.locator("#pg-create-tournament").click();
  await page.locator("#pg-category").fill("Maxi +35 Browser");
  await page.locator("#pg-create-category").click();
  for (const team of ["Browser A", "Browser B", "Browser C", "Browser D"]) {
    await page.locator("#pg-team").fill(team);
    await page.locator("#pg-add-team").click();
  }
  await page.locator("#pg-fixture").click();
  await expect(page.locator("#pg-match option")).toHaveCount(7);
  const matchId = await page.locator("#pg-match").inputValue();
  await page.locator("#pg-date").fill("2027-06-13T15:00");
  await page.locator("#pg-court").fill("Cancha Browser");
  await page.locator("#pg-schedule").click();
  await page.locator("#pg-local").fill("80");
  await page.locator("#pg-away").fill("70");
  await page.locator("#pg-result").click();
  await page.getByRole("button", { name: "Público" }).click();
  await expect(page.locator("#view-public")).toContainText("80");
  await page.reload();
  await expect(page.locator("#circuit-status")).toContainText("PostgreSQL local conectado");
  await expect(page.locator("#view-public")).toContainText("80");
  expect(matchId).toBeTruthy();
});
