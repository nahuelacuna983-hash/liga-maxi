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
  const credentialsData = JSON.parse(credentials);
  const { email, password } = credentialsData.association;
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
  await page.locator('.assoc-nav-btn[data-asociacion-panel="programacion"]').click();
  await expect.poll(() => page.locator(".programacion-row").count(), {
    timeout: 20000,
    message: "La programación no se reconstruyó para la categoría seleccionada"
  }).toBeGreaterThan(0);
  console.log(`APDB_BROWSER_SCHEDULE_ROWS ${JSON.stringify(await page.locator(".programacion-row").evaluateAll((rows) => rows.map((row) => row.dataset.partidoId)))}`);
  const matchId = await page.locator(".programacion-row").first().getAttribute("data-partido-id");
  console.log(`APDB_BROWSER_MATCH_ID ${matchId}`);
  expect(matchId).toMatch(/^[0-9a-f-]{36}$/i);
  const scheduleRow = page.locator(`.programacion-row[data-partido-id="${matchId}"]`);
  await expect(scheduleRow).toHaveCount(1, { timeout: 20000 });
  await scheduleRow.locator(".programacion-fecha").fill("2027-08-21");
  await scheduleRow.locator(".programacion-hora").fill("21:30");
  await scheduleRow.locator(".programacion-cancha").fill("Gimnasio Sintético");
  const scheduleResponse = page.waitForResponse((item) => item.url().includes("/rest/v1/rpc/apdb_upsert_match_schedule") && item.request().method() === "POST");
  await scheduleRow.locator(".programacion-save-btn").click();
  expect((await scheduleResponse).status()).toBe(200);
  await expect(scheduleRow).toContainText("Listo para informar");
  console.log("APDB_BROWSER_SCHEDULE_PERSISTED true");
  await page.locator('.assoc-nav-btn[data-asociacion-panel="operacion"]').click();
  await expect(page.locator(`#asociacion-partido option[value="${matchId}"]`)).toHaveCount(1, { timeout: 20000 });
  await page.locator("#asociacion-partido").evaluate((select, id) => { select.value = id; }, matchId);
  await page.locator("#asociacion-puntos-local").fill("80");
  await page.locator("#asociacion-puntos-visitante").fill("70");
  page.once("dialog", (dialog) => dialog.accept());
  const saveResponse = page.waitForResponse((item) => item.url().includes("/rest/v1/rpc/apdb_association_update_result") && item.request().method() === "POST");
  await page.locator("#asociacion-guardar").click();
  expect((await saveResponse).status()).toBe(200);
  await expect(page.locator("#asociacion-status")).toContainText("Corrección guardada correctamente.");
  await page.locator("#asociacion-partido").selectOption(matchId);
  await expect(page.locator("#asociacion-puntos-local")).toHaveValue("80");
  await expect(page.locator("#asociacion-puntos-visitante")).toHaveValue("70");
  console.log("APDB_BROWSER_ASSOCIATION_RESULT_PERSISTED true");
  await page.locator("#auth-logout").click();
  await expect(page.locator("#auth-status")).toContainText("Sesion cerrada.");
  await page.locator("#tab-acceso").evaluate((element) => { element.hidden = false; element.removeAttribute("aria-hidden"); element.click(); });
  await page.locator("#auth-login").waitFor({ state: "visible", timeout: 10000 });
  await page.locator("#auth-email").fill(credentialsData.delegate.email);
  await page.locator("#auth-password").fill(credentialsData.delegate.password);
  await page.locator("#auth-login").click();
  await expect.poll(() => page.locator("#auth-status").innerText(), {
    timeout: 20000,
    message: "El delegado no alcanzó un estado terminal de autenticación"
  }).toMatch(/Ingreso correcto|No se pudo ingresar|Autenticación requerida|Identidad revocada/);
  expect(await page.locator("#auth-status").innerText()).toContain("Ingreso correcto");
  await page.locator("#tab-delegados").click();
  await expect(page.locator("#delegado-categoria option")).not.toHaveCount(0, { timeout: 20000 });
  await page.locator("#delegado-categoria").selectOption({ label: "Categoría sintética A" });
  await expect(page.locator("#delegado-partido option")).not.toHaveCount(0, { timeout: 20000 });
  const delegateMatchId = await page.locator("#delegado-partido option").last().getAttribute("value");
  expect(delegateMatchId).toMatch(/^[0-9a-f-]{36}$/i);
  await page.locator("#delegado-partido").evaluate((select, id) => { select.value = id; }, delegateMatchId);
  await page.locator("#delegado-puntos-local").fill("75");
  await page.locator("#delegado-puntos-visitante").fill("68");
  page.once("dialog", (dialog) => dialog.accept());
  const delegateResponse = page.waitForResponse((item) => item.url().includes("/rest/v1/rpc/apdb_save_result") && item.request().method() === "POST");
  await page.locator("#delegado-guardar").click();
  expect((await delegateResponse).status()).toBe(200);
  await expect(page.locator("#delegado-status")).toContainText("Resultado guardado correctamente.");
  console.log("APDB_BROWSER_DELEGATE_RESULT_PERSISTED true");
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
  await page.locator("#asociacion-partido").selectOption(matchId);
  await expect(page.locator("#asociacion-puntos-local")).toHaveValue("80", { timeout: 20000 });
  await expect(page.locator("#asociacion-puntos-visitante")).toHaveValue("70", { timeout: 20000 });
  console.log("APDB_BROWSER_RESULT_RECOVERED_AFTER_RELOAD true");
  console.log("APDB_BROWSER_SESSION_REAUTHENTICATED_AFTER_RELOAD true");
});
