const { test, expect } = require("@playwright/test");
const base = process.env.POSTGRES_UI_BASE_URL || "http://127.0.0.1:8787/demo_circuito_2027.html?mode=postgres";
test.skip(!process.env.POSTGRES_UI_BASE_URL, "Requiere PostgreSQL 16 y el backend HTTP levantado por CI.");
async function playoffResult(page, local, away) {
  const state = await page.locator("#pg-playoff-state").textContent();
  const options = await page.locator("#pg-playoff-match option").evaluateAll((items) => items.filter((item) => item.value).map((item) => ({ value: item.value, label: item.textContent })));
  if (!options.length) throw new Error(`No quedan playoffs Top 8 pendientes; estado=${JSON.stringify(state)} opciones=${JSON.stringify(options)}`);
  const id = options[0].value;
  console.log(`[top8] playoff antes id=${id} opciones=${JSON.stringify(options)} estado=${JSON.stringify(state)}`);
  await page.locator("#pg-playoff-match").selectOption(id);
  await page.locator("#pg-playoff-local").fill(String(local));
  await page.locator("#pg-playoff-away").fill(String(away));
  const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/playoffs") && response.request().method() === "POST", { timeout: 10000 });
  await page.locator("#pg-playoff-result").click();
  const response = await responsePromise;
  const body = await response.text();
  if (!response.ok()) throw new Error(`Top 8 POST rechazado partido=${id} status=${response.status()} body=${body} estado=${JSON.stringify(await page.locator("#pg-playoff-state").textContent())}`);
  await expect(page.locator("#circuit-status")).toContainText("Resultado de playoff confirmado");
  console.log(`[top8] playoff confirmado id=${id} status=${response.status()}`);
  return id;
}
async function advancePlayoffs(page, expectedRound) {
  const categoryId = await page.evaluate(() => localStorage.getItem("pg-category-id"));
  const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/playoffs") && response.request().method() === "POST", { timeout: 10000 });
  await page.locator("#pg-playoff-advance").click();
  const response = await responsePromise;
  const body = await response.text();
  if (!response.ok()) throw new Error(`Top 8 avance rechazado status=${response.status()} body=${body} estado=${JSON.stringify(await page.locator("#pg-playoff-state").textContent())}`);
  const persistedResponse = await page.request.get(`${new URL(base).origin}/api/categories/${categoryId}/playoffs`);
  const persisted = await persistedResponse.json();
  const matches = persisted.playoff?.payload?.matches || [];
  const pending = matches.filter((match) => match.ronda === expectedRound && match.puntos_local == null && match.puntos_visitante == null);
  if (!pending.length) throw new Error(`Top 8 avance sin ${expectedRound} pendiente status=${response.status()} body=${body} payload=${JSON.stringify(matches)} estado=${JSON.stringify(await page.locator("#pg-playoff-state").textContent())}`);
  console.log(`[top8] avance confirmado ronda=${expectedRound} status=${response.status()} pendientes=${pending.length}`);
}
test("completa Top 8 persistente con cuartos, semifinales, final y recuperación", async ({ page }) => {
  test.setTimeout(120000);
  const started = Date.now();
  const stage = (name) => console.log(`[top8] ${name} +${Date.now() - started}ms`);
  const errors = []; page.on("pageerror", (error) => errors.push(error.message)); page.on("requestfailed", (request) => errors.push(`${request.method()} ${request.url()}`));
  stage("inicio"); await page.goto(base); await expect(page.locator("#circuit-status")).toContainText("PostgreSQL local conectado"); await page.getByRole("button", { name: "Asociación" }).click(); stage("contexto listo");
  await page.locator("#pg-tournament").fill("Top 8 persistente"); await page.locator("#pg-create-tournament").click(); await page.locator("#pg-category").fill("Maxi +35 Top 8"); await page.locator("#pg-create-category").click(); await expect(page.locator("#circuit-status")).toContainText("Categoría confirmada");
  for (let i = 1; i <= 8; i += 1) { await page.locator("#pg-team").fill(`Top8 ${i}`); await page.locator("#pg-add-team").click(); await expect(page.locator("#pg-team-state")).toContainText(`Equipos persistidos: ${i}`); } stage("equipos listos");
  await page.locator("#pg-fixture").click(); await expect(page.locator("#pg-match option")).toHaveCount(29); stage("fixture listo");
  for (let i = 1; i <= 28; i += 1) { await page.locator("#pg-match").selectOption({ index: i }); await page.locator("#pg-local").fill(String(90 + i)); await page.locator("#pg-away").fill(String(60 + i)); await page.locator("#pg-result").click(); await expect(page.locator("#circuit-status")).toContainText("Resultado confirmado"); } stage("fase regular lista");
  await page.locator("#pg-playoff-top").selectOption("8"); await expect(page.locator("#pg-playoff-top")).toHaveValue("8"); await page.locator("#pg-playoff-generate").click(); await expect(page.locator("#pg-playoff-match option")).toHaveCount(5);
  for (let i = 0; i < 4; i += 1) await playoffResult(page, 82 + i, 70); stage("cuartos listos"); await advancePlayoffs(page, "semifinales"); await expect(page.locator("#pg-playoff-match option")).toHaveCount(3); stage("semifinales generadas");
  await playoffResult(page, 88, 75); await playoffResult(page, 87, 74); await advancePlayoffs(page, "final"); await expect(page.locator("#pg-playoff-match option")).toHaveCount(2); stage("final generada"); await playoffResult(page, 91, 80); await page.locator("#pg-playoff-advance").click(); await expect(page.locator("#pg-playoff-state")).toContainText("Campeón:"); const champion = await page.locator("#pg-playoff-state").textContent(); stage("campeón confirmado");
  await page.reload(); await page.getByRole("button", { name: "Asociación" }).click(); await expect(page.locator("#pg-playoff-state")).toContainText("Campeón:"); expect(await page.locator("#pg-playoff-state").textContent()).toContain(champion.match(/Campeón:[^\n]+/)?.[0] || "Campeón:"); expect(errors).toEqual([]); stage("recuperación lista");
});
