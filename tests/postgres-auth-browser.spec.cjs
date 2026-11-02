const { test, expect } = require("@playwright/test");

const base = process.env.POSTGRES_AUTH_UI_BASE_URL;
test.skip(!base, "Requiere PostgreSQL 16, backend con LM_REQUIRE_AUTH=1 y usuarios sintéticos preparados.");

test("Chromium usa sesión de desarrollo y respeta autorización del backend", async ({ page }) => {
  const responses = [];
  page.on("response", (response) => { if (response.url().includes("/api/")) responses.push({ url: response.url(), status: response.status() }); });
  await page.goto(base);
  await page.getByRole("button", { name: "Asociación" }).click();
  await page.locator("#pg-login-user").fill(process.env.POSTGRES_AUTH_USER || "dev-organizer");
  await page.locator("#pg-login").click();
  await expect(page.locator("#circuit-status")).toContainText("Sesión de desarrollo iniciada");
  await page.locator("#pg-tournament").fill("Chromium autenticado");
  const create = page.waitForResponse((response) => response.url().endsWith("/api/tournaments") && response.request().method() === "POST");
  await page.locator("#pg-create-tournament").click();
  expect((await create).status()).toBe(201);
  await page.locator("#pg-logout").click();
  await expect(page.locator("#circuit-status")).toContainText("Sesión cerrada");
  expect(responses.some((item) => item.url.endsWith("/api/tournaments") && item.status === 201)).toBe(true);
});
