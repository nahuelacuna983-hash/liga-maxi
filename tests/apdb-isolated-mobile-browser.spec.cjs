"use strict";

const fs = require("node:fs");
const { test, expect } = require("@playwright/test");

const backendUrl = process.env.APDB_ISOLATED_BROWSER_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const credentialsPath = process.env.APDB_BROWSER_CREDENTIALS_FILE;

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test("APdB 2027: celular abre portada pública y permite ingreso de Asociación", async ({ page }) => {
  test.setTimeout(90000);
  if (!backendUrl || !anonKey || !credentialsPath) {
    throw new Error("Se requieren credenciales sintéticas de Supabase descartable");
  }
  if (/\.supabase\.co\/?$/i.test(backendUrl)) {
    throw new Error("La prueba móvil rechaza Supabase alojado");
  }
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8")).association;

  await page.addInitScript(({ url, key }) => {
    window.APDB_SUPABASE_URL = url;
    window.APDB_SUPABASE_ANON_KEY = key;
  }, { url: backendUrl, key: anonKey });

  await page.goto("/index_online.html?secureResults=1", {
    waitUntil: "domcontentloaded",
    timeout: 20000
  });
  await expect(page.locator("#tab-publico")).toBeVisible();
  await expect(page.locator("#vista-publico")).toBeVisible();
  await expect(page.locator("#publico-categoria")).toBeVisible();
  await expect.poll(
    () => page.locator("#publico-categoria option").count(),
    { timeout: 30000 }
  ).toBeGreaterThan(0);

  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    publicVisible: getComputedStyle(document.querySelector("#vista-publico")).display !== "none"
  }));
  expect(viewport.width).toBe(390);
  expect(viewport.publicVisible).toBe(true);
  console.log(`APDB_MOBILE_PUBLIC_VIEW ${JSON.stringify(viewport)}`);
  await page.screenshot({ path: "test-results/apdb-2027-mobile-public.png", fullPage: true });

  // The real secure-result mode must expose login without test-only DOM edits.
  await expect(page.locator("#tab-acceso")).toBeVisible({ timeout: 30000 });
  await page.locator("#tab-acceso").click();
  await expect(page.locator("#auth-email")).toBeVisible();
  await page.locator("#auth-email").fill(credentials.email);
  await page.locator("#auth-password").fill(credentials.password);
  await page.locator("#auth-login").click();

  await expect(page.locator("#auth-status")).toContainText("Ingreso correcto", {
    timeout: 30000
  });
  await page.locator("#tab-publico").click();
  await expect(page.locator("#vista-publico")).toBeVisible();

  console.log("APDB_ISOLATED_MOBILE_BROWSER_OK viewport=390 auth=true navigation=true");
});
