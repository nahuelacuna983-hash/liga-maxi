const { test, expect } = require("@playwright/test");
const fs = require("node:fs");

const isolatedUrl = process.env.APDB_ISOLATED_BROWSER_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const credentialsFile = process.env.APDB_BROWSER_CREDENTIALS_FILE;

test("cambio de Asociación a Delegado y recuperación sin heredar datos privados", async ({ page }) => {
  test.setTimeout(60000);
  if (!isolatedUrl || !anonKey || !credentialsFile) {
    throw new Error("APDB isolated session switch requires isolated URL, anon key and credentials file");
  }
  const credentials = JSON.parse(fs.readFileSync(credentialsFile, "utf8"));
  await page.addInitScript(({ url, key }) => {
    window.APDB_SUPABASE_URL = url;
    window.APDB_SUPABASE_ANON_KEY = key;
  }, { url: isolatedUrl, key: anonKey });
  await page.goto("/index_online.html?secureResults=1", { waitUntil: "domcontentloaded" });

  async function login(account) {
    await page.locator("#tab-acceso").click();
    await page.locator("#auth-email").fill(account.email);
    await page.locator("#auth-password").fill(account.password);
    await page.locator("#auth-login").click();
    await expect(page.locator("#auth-status")).toContainText("Ingreso correcto", { timeout: 20000 });
  }
  async function logout() {
    await page.locator("#tab-acceso").click();
    await page.locator("#auth-logout").click();
    await expect(page.locator("#auth-session-bar")).toContainText("Sin usuario iniciado", { timeout: 10000 });
    await expect(page.locator("#delegado-info")).toHaveText("");
  }

  await login(credentials.association);
  await page.locator("#tab-asociacion").click();
  await expect(page.locator("#asociacion-categoria option")).not.toHaveCount(0, { timeout: 20000 });
  const associationCategory = await page.locator("#asociacion-categoria").inputValue();
  expect(associationCategory).not.toBe("");
  await logout();

  await login(credentials.delegate);
  await page.locator("#tab-delegados").click();
  await expect(page.locator("#delegado-info")).toContainText("Delegado:", { timeout: 20000 });
  await expect(page.locator("#delegado-categoria option")).not.toHaveCount(0, { timeout: 20000 });
  await expect(page.locator("#asociacion-categoria")).toBeDisabled();
  await logout();

  await login(credentials.association);
  await page.locator("#tab-asociacion").click();
  await expect(page.locator("#asociacion-categoria option")).not.toHaveCount(0, { timeout: 20000 });
  await expect(page.locator("#asociacion-categoria")).toHaveValue(associationCategory);
});
