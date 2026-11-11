const { test, expect } = require("@playwright/test");

const isolatedUrl = process.env.APDB_ISOLATED_BROWSER_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const credentialsFile = process.env.APDB_BROWSER_CREDENTIALS_FILE;

test.beforeEach(async ({ page }) => {
  if (!isolatedUrl || !anonKey || !credentialsFile) {
    throw new Error("APDB isolated browser requires the isolated URL, anon key and a temporary credentials file");
  }
  await page.addInitScript(({ url, key }) => {
    window.APDB_SUPABASE_URL = url;
    window.APDB_SUPABASE_ANON_KEY = key;
  }, { url: isolatedUrl, key: anonKey });
});

test("index_online usa Supabase aislado y conserva la sesión autorizada", async ({ page }) => {
  test.setTimeout(60000);
  page.on("pageerror", (error) => console.log(`APDB_BROWSER_PAGE_ERROR ${error.message}`));
  page.on("requestfailed", (request) => console.log(`APDB_BROWSER_REQUEST_FAILED ${request.url()} ${request.failure()?.errorText || "unknown"}`));
  const response = await page.goto("/index_online.html?secureResults=1", { waitUntil: "domcontentloaded", timeout: 15000 });
  console.log(`APDB_BROWSER_PAGE_STATE status=${response?.status() || "none"} url=${page.url()} title=${await page.title()} html=${(await page.content()).length}`);
  await page.locator("#auth-login").waitFor({ state: "visible", timeout: 10000 });
  const credentials = require("node:fs").readFileSync(credentialsFile, "utf8");
  const { email, password } = JSON.parse(credentials);
  await page.locator("#auth-email").fill(email);
  await page.locator("#auth-password").fill(password);
  await page.locator("#auth-login").click();
  await expect(page.locator("#auth-status")).toContainText("Ingreso correcto", { timeout: 15000 });
  await expect(page.locator("#auth-session-bar")).toContainText("Rol:");
  await page.reload({ waitUntil: "domcontentloaded", timeout: 20000 });
  await expect(page.locator("#auth-status")).toContainText(/iniciá sesión|Ingresá|sesión/i);
});
