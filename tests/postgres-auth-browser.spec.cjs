const { test, expect } = require("@playwright/test");
const { Pool } = require("pg");
const crypto = require("node:crypto");

const base = process.env.POSTGRES_AUTH_UI_BASE_URL;
test.skip(!base, "Requiere PostgreSQL 16, backend con LM_REQUIRE_AUTH=1 y usuarios sintéticos preparados.");

test("Chromium usa sesión de desarrollo y respeta autorización del backend", async ({ page }) => {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_AUTH_DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL es obligatorio para preparar usuarios sintéticos autenticados.");
  const db = new Pool({ connectionString: databaseUrl });
  await db.query("insert into lm_demo_organizations(id,name) values('00000000-0000-4000-8000-000000000101','Organización visual autenticada') on conflict (id) do nothing");
  await db.query("insert into lm_demo_users(id,username,role) values('00000000-0000-4000-8000-000000000201','dev-organizer','organizer'),('00000000-0000-4000-8000-000000000203','dev-delegate','delegate') on conflict (id) do nothing");
  await db.query("insert into lm_demo_memberships(user_id,organization_id) values('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000101'),('00000000-0000-4000-8000-000000000203','00000000-0000-4000-8000-000000000101') on conflict do nothing");
  await db.end();
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
  const anonymous = await page.request.post(new URL("/api/tournaments", base).toString(), { data: { id: crypto.randomUUID(), organizationId: "00000000-0000-4000-8000-000000000101", name: "Anónimo", season: 2027 } });
  expect(anonymous.status()).toBe(400);
  const delegateLogin = await page.request.post(new URL("/api/auth/dev-login", base).toString(), { data: { userId: "dev-delegate" } });
  const delegateToken = (await delegateLogin.json()).token;
  const forbidden = await page.request.post(new URL("/api/fixtures", base).toString(), { headers: { authorization: `Bearer ${delegateToken}` }, data: { categoryId: "00000000-0000-4000-8000-000000000000", matches: [] } });
  expect(forbidden.status()).toBe(400);
  expect(responses.some((item) => item.url.endsWith("/api/tournaments") && item.status === 201)).toBe(true);
});
