const { test, expect } = require("@playwright/test");

const isolatedUrl = process.env.APDB_ISOLATED_BROWSER_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const email = process.env.APDB_BROWSER_EMAIL;
const password = process.env.APDB_BROWSER_PASSWORD;

test.beforeEach(async ({ page }) => {
  if (!isolatedUrl || !anonKey || !email || !password) {
    throw new Error("APDB isolated browser requires APDB_ISOLATED_BROWSER_URL, SUPABASE_ANON_KEY, APDB_BROWSER_EMAIL and APDB_BROWSER_PASSWORD");
  }
  await page.addInitScript(({ url, key }) => {
    window.APDB_SUPABASE_URL = url;
    window.APDB_SUPABASE_ANON_KEY = key;
  }, { url: isolatedUrl, key: anonKey });
});

test("index_online usa Supabase aislado y conserva la sesión autorizada", async ({ page }) => {
  await page.goto("/index_online.html?secureResults=1");
  await page.locator("#auth-email").fill(email);
  await page.locator("#auth-password").fill(password);
  await page.locator("#auth-login").click();
  await expect(page.locator("#auth-status")).toContainText("Ingreso correcto", { timeout: 15000 });
  await expect(page.locator("#auth-session-bar")).toContainText("Rol:");
  await page.reload();
  await expect(page.locator("#auth-status")).toContainText(/iniciá sesión|Ingresá|sesión/i);
});
