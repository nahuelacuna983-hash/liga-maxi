"use strict";
const fs = require("node:fs");
const { test, expect } = require("@playwright/test");
const credentialsFile = process.env.APDB_BROWSER_CREDENTIALS_FILE;

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
test("APdB institutional package uses Auth only with Association and Delegate scopes", async ({ page }) => {
  test.setTimeout(90000);
  if (!credentialsFile) throw new Error("Missing disposable synthetic credentials");
  const { association, delegate } = JSON.parse(fs.readFileSync(credentialsFile, "utf8"));
  await page.goto("/apdb-2027-prueba/index.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#vista-publico")).toBeVisible();
  await expect(page.locator("#tab-acceso")).toBeVisible({ timeout: 15000 });
  await expect(page.locator("#delegado-clave")).toBeHidden();
  await expect(page.locator("#asociacion-clave")).toBeHidden();
  await expect(page.locator("#auth-session-bar")).toBeHidden();
  await expect(page.locator("body")).not.toContainText("Las claves actuales siguen funcionando");
  await expect.poll(() => page.locator("#publico-categoria option").count(), { timeout: 25000 }).toBeGreaterThan(0);
  async function login(account) {
    await page.locator("#tab-acceso").click();
    await page.locator("#auth-email").fill(account.email);
    await page.locator("#auth-password").fill(account.password);
    await page.locator("#auth-login").click();
    await expect(page.locator("#auth-status")).toContainText("Ingreso correcto", { timeout: 25000 });
    await expect(page.locator("#auth-session-bar")).toBeVisible();
  }
  async function logout() {
    await page.locator("#tab-acceso").click();
    await page.locator("#auth-logout").click();
    await expect(page.locator("#auth-session-bar")).toBeHidden({ timeout: 15000 });
  }
  await login(association);
  await page.locator("#tab-asociacion").click();
  await expect(page.locator("#asociacion-categoria")).toBeEnabled();
  await expect.poll(() => page.locator("#asociacion-categoria option").count(), { timeout: 20000 }).toBeGreaterThan(0);
  // Test both new session-only drafts and stale V1/V2 entries from localStorage.
  await page.evaluate(() => {
    const prefix = `${APP_CONFIG.producto.storageRoot}_${APP_CONFIG.organizacionActiva.id}`;
    const emailKey = `${prefix}_programacion_email_destino`;
    const plannerKey = `${prefix}_planner_simulaciones`;
    sessionStorage.setItem(emailKey, "delegados@example.invalid");
    sessionStorage.setItem(plannerKey, JSON.stringify({ privado: "borrador" }));
    localStorage.setItem(emailKey, "correo-antiguo@example.invalid");
    localStorage.setItem(plannerKey, JSON.stringify({ privado: "cache-antigua" }));
    document.querySelector("#programacion-email-destino").value = "delegados@example.invalid";
  });
  await logout();
  const remaining = await page.evaluate(() => {
    const prefix = `${APP_CONFIG.producto.storageRoot}_${APP_CONFIG.organizacionActiva.id}`;
    const keys = [`${prefix}_programacion_email_destino`, `${prefix}_planner_simulaciones`];
    return keys.flatMap(key => [sessionStorage.getItem(key), localStorage.getItem(key)]);
  });
  expect(remaining).toEqual([null, null, null, null]);
  await expect(page.locator("#programacion-email-destino")).toHaveValue("");
  await login(delegate);
  await page.locator("#tab-delegados").click();
  await expect(page.locator("#delegado-info")).toContainText("Delegado:", { timeout: 25000 });
  await expect(page.locator("#asociacion-categoria")).toBeDisabled();
  await expect(page.locator("#delegado-clave")).toBeHidden();
  await expect(page.locator("#delegado-desbloquear")).toBeHidden();
  await expect(page.locator("#asociacion-desbloquear")).toBeHidden();
  await logout();
  // A shared device must not restore a previous Association/Delegate session after logout.
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#auth-session-bar")).toBeHidden({ timeout: 15000 });
  await expect(page.locator("#asociacion-categoria")).toBeDisabled();
  await expect(page.locator("#delegado-info")).toHaveText("");
  await expect(page.locator("#delegado-clave")).toBeHidden();
  await expect(page.locator("#asociacion-clave")).toBeHidden();
  // Opening another tab with the same browser profile must remain unauthenticated.
  const secondTab = await page.context().newPage();
  await secondTab.goto("/apdb-2027-prueba/index.html", { waitUntil: "domcontentloaded" });
  await expect(secondTab.locator("#auth-session-bar")).toBeHidden({ timeout: 15000 });
  await expect(secondTab.locator("#asociacion-categoria")).toBeDisabled();
  const crossTabDrafts = await secondTab.evaluate(() => {
    const prefix = `${APP_CONFIG.producto.storageRoot}_${APP_CONFIG.organizacionActiva.id}`;
    return [
      localStorage.getItem(`${prefix}_programacion_email_destino`),
      localStorage.getItem(`${prefix}_planner_simulaciones`)
    ];
  });
  expect(crossTabDrafts).toEqual([null, null]);
  await secondTab.close();
  console.log("APDB_INSTITUTIONAL_BUILT_AUTH_BROWSER_OK official_bundle=true mobile=true association=true delegate=true legacy_keys=false logout_reload=true shared_profile=true");
});
