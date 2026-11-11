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
  page.on("console", (message) => console.log(`APDB_BROWSER_CONSOLE ${message.type()} ${message.text()}`));
  page.on("request", (request) => {
    if (request.url().includes("/auth/v1/token")) console.log(`APDB_BROWSER_AUTH_REQUEST ${request.method()} ${request.url()}`);
  });
  page.on("response", async (response) => {
    if (response.url().includes("/auth/v1/token")) console.log(`APDB_BROWSER_AUTH_RESPONSE ${response.status()}`);
  });
  page.on("requestfailed", (request) => console.log(`APDB_BROWSER_REQUEST_FAILED ${request.url()} ${request.failure()?.errorText || "unknown"}`));
  const response = await page.goto("/index_online.html?secureResults=1", { waitUntil: "domcontentloaded", timeout: 15000 });
  console.log(`APDB_BROWSER_PAGE_STATE status=${response?.status() || "none"} url=${page.url()} title=${await page.title()} html=${(await page.content()).length}`);
  await page.locator("#tab-acceso").evaluate((element) => { element.hidden = false; element.removeAttribute("aria-hidden"); element.click(); });
  await page.locator("#auth-login").waitFor({ state: "visible", timeout: 10000 });
  const credentials = require("node:fs").readFileSync(credentialsFile, "utf8");
  const { email, password } = JSON.parse(credentials);
  await page.locator("#auth-email").fill(email);
  await page.locator("#auth-password").fill(password);
  await page.locator("#auth-login").click();
  await expect.poll(() => page.locator("#auth-status").innerText(), {
    timeout: 20000,
    message: "La autenticación no alcanzó un estado terminal"
  }).toMatch(/Ingreso correcto|No se pudo ingresar|Autenticación requerida|Identidad revocada/);
  const authStatus = await page.locator("#auth-status").innerText();
  console.log(`APDB_BROWSER_AUTH_STATUS ${authStatus}`);
  expect(authStatus).toContain("Ingreso correcto");
  await expect(page.locator("#auth-session-bar")).toContainText("Rol:");
  await page.locator("#tab-asociacion").click();
  await page.locator('.assoc-nav-btn[data-asociacion-panel="operacion"]').click();
  console.log(`APDB_BROWSER_ASSOCIATION_OPTIONS ${JSON.stringify(await page.locator("#asociacion-categoria option").allTextContents())}`);
  console.log(`APDB_BROWSER_PUBLIC_OPTIONS ${JSON.stringify(await page.locator("#publico-categoria option").allTextContents())}`);
  await expect(page.locator("#asociacion-categoria option")).not.toHaveCount(0, { timeout: 20000 });
  await page.locator("#asociacion-categoria").selectOption({ label: "Categoría sintética A" });
  const visibleMatch = page.locator("#asociacion-partido option").first();
  await expect(visibleMatch).toHaveCount(1, { timeout: 20000 });
  const matchId = await visibleMatch.getAttribute("value");
  console.log(`APDB_BROWSER_MATCH_ID ${matchId}`);
  expect(matchId).toMatch(/^[0-9a-f-]{36}$/i);
  await page.locator("#asociacion-partido").evaluate((select, id) => { select.value = id; }, matchId);
  await page.locator("#asociacion-puntos-local").fill("80");
  await page.locator("#asociacion-puntos-visitante").fill("70");
  page.once("dialog", (dialog) => dialog.accept());
  const saveResponse = page.waitForResponse((item) => item.url().includes("/rest/v1/rpc/apdb_association_update_result") && item.request().method() === "POST");
  await page.locator("#asociacion-guardar").click();
  expect((await saveResponse).status()).toBe(200);
  await expect(page.locator("#asociacion-status")).toContainText("Corrección guardada correctamente.");
  await expect(page.locator("#asociacion-detalle")).toContainText("80");
  console.log("APDB_BROWSER_ASSOCIATION_RESULT_PERSISTED true");
  await page.reload({ waitUntil: "domcontentloaded", timeout: 20000 });
  await page.locator("#tab-acceso").evaluate((element) => { element.hidden = false; element.removeAttribute("aria-hidden"); element.click(); });
  await page.locator("#auth-login").waitFor({ state: "visible", timeout: 10000 });
  await page.locator("#auth-email").fill(email);
  await page.locator("#auth-password").fill(password);
  await page.locator("#auth-login").click();
  await expect.poll(() => page.locator("#auth-status").innerText(), {
    timeout: 20000,
    message: "La autenticación posterior a la recarga no alcanzó un estado terminal"
  }).toMatch(/Ingreso correcto|No se pudo ingresar|Autenticación requerida|Identidad revocada/);
  const restoredStatus = await page.locator("#auth-status").innerText();
  console.log(`APDB_BROWSER_RESTORED_AUTH_STATUS ${restoredStatus}`);
  expect(restoredStatus).toContain("Ingreso correcto");
  await expect(page.locator("#auth-session-bar")).toContainText("Rol:", { timeout: 20000 });
  await page.locator("#tab-asociacion").click();
  await page.locator('.assoc-nav-btn[data-asociacion-panel="operacion"]').click();
  await expect(page.locator("#asociacion-categoria option")).not.toHaveCount(0, { timeout: 20000 });
  await page.locator("#asociacion-categoria").selectOption({ label: "Categoría sintética A" });
  await expect(page.locator("#asociacion-partido option").first()).toHaveCount(1, { timeout: 20000 });
  await page.locator("#asociacion-partido").evaluate((select, id) => { select.value = id; }, matchId);
  await expect(page.locator("#asociacion-detalle")).toContainText("80", { timeout: 20000 });
  console.log("APDB_BROWSER_RESULT_RECOVERED_AFTER_RELOAD true");
  console.log("APDB_BROWSER_SESSION_REAUTHENTICATED_AFTER_RELOAD true");
});
