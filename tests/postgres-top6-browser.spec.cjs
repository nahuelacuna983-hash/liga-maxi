const { test, expect } = require("@playwright/test");
const base = process.env.POSTGRES_UI_BASE_URL || "http://127.0.0.1:8787/demo_circuito_2027.html?mode=postgres";
test.skip(!process.env.POSTGRES_UI_BASE_URL, "Requiere PostgreSQL 16 y el backend HTTP levantado por CI.");
async function playoffResult(page, local, away) {
  const state = await page.locator("#pg-playoff-state").textContent();
  const options = await page.locator("#pg-playoff-match option").evaluateAll((items) => items.filter((item) => item.value).map((item) => ({ value: item.value, label: item.textContent })));
  if (!options.length) throw new Error(`No quedan playoffs pendientes; estado=${JSON.stringify(state)} opciones=${JSON.stringify(options)}`);
  const id = options[0].value;
  await page.locator("#pg-playoff-match").selectOption(id);
  await page.locator("#pg-playoff-local").fill(String(local));
  await page.locator("#pg-playoff-away").fill(String(away));
  await page.locator("#pg-playoff-result").click();
  await expect(page.locator("#circuit-status")).toContainText("Resultado de playoff confirmado");
  return id;
}
test("completa Top 6 persistente con repechaje, semifinales, final y recuperación", async ({ page }) => {
  test.setTimeout(120000);
  const started = Date.now();
  const stage = (name) => console.log(`[top6] ${name} +${Date.now() - started}ms`);
  const errors = []; page.on("pageerror", (error) => errors.push(error.message)); page.on("requestfailed", (request) => errors.push(`${request.method()} ${request.url()}`));
  stage("inicio"); await page.goto(base); await expect(page.locator("#circuit-status")).toContainText("PostgreSQL local conectado"); await page.getByRole("button", { name: "Asociación" }).click(); stage("contexto listo");
  await page.locator("#pg-tournament").fill("Top 6 persistente"); await page.locator("#pg-create-tournament").click(); await expect(page.locator("#circuit-status")).toContainText("Torneo confirmado");
  await page.locator("#pg-category").fill("Maxi +35 Top 6"); await page.locator("#pg-create-category").click(); await expect(page.locator("#circuit-status")).toContainText("Categoría confirmada");
  for (let i = 1; i <= 6; i += 1) { await page.locator("#pg-team").fill(`Top6 ${i}`); await page.locator("#pg-add-team").click(); await expect(page.locator("#pg-team-state")).toContainText(`Equipos persistidos: ${i}`); } stage("equipos listos");
  await page.locator("#pg-fixture").click(); await expect(page.locator("#pg-match option")).toHaveCount(16); stage("fixture listo");
  for (let i = 1; i <= 15; i += 1) { await page.locator("#pg-match").selectOption({ index: i }); await page.locator("#pg-local").fill(String(80 + i)); await page.locator("#pg-away").fill(String(60 + i)); await page.locator("#pg-result").click(); await expect(page.locator("#circuit-status")).toContainText("Resultado confirmado"); } stage("fase regular lista");
  await page.locator("#pg-playoff-top").selectOption("6");
  await expect(page.locator("#pg-playoff-top")).toHaveValue("6");
  const categoryId = await page.evaluate(() => localStorage.getItem("pg-category-id"));
  let generation = null;
  const generationResponse = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/playoffs"));
  await page.locator("#pg-playoff-generate").click();
  const response = await generationResponse;
  generation = { status: response.status(), body: await response.text() };
  await expect(page.locator("#circuit-status")).toContainText("Playoffs confirmados");
  const persistedResponse = await page.request.get(`${new URL(base).origin}/api/categories/${categoryId}/playoffs`);
  const persisted = { status: persistedResponse.status(), body: await persistedResponse.text() };
  const selectorOptions = await page.locator("#pg-playoff-match option").evaluateAll((items) => items.map((item) => ({ value: item.value, label: item.textContent })));
  const stateText = await page.locator("#pg-playoff-state").textContent();
  let generationPayload = null;
  let persistedPayload = null;
  try { generationPayload = JSON.parse(generation.body); } catch (_) { /* included in diagnostic below */ }
  try { persistedPayload = JSON.parse(persisted.body); } catch (_) { /* included in diagnostic below */ }
  expect(generationPayload?.format).toBe("top6");
  expect(persistedPayload?.playoff?.format).toBe("top6");
  expect(persistedPayload?.playoff?.payload?.formato).toBe("top6");
  const payloadMatches = persistedPayload?.playoff?.payload?.matches || generationPayload?.payload?.matches || [];
  if (payloadMatches.filter((match) => match.ronda === "repechaje").length !== 4 || selectorOptions.filter((option) => option.value).length !== 4) {
    throw new Error(`Top 6 divergence after generation: expected=4 payload=${JSON.stringify(payloadMatches.map(({ partido_numero, ronda, llave, serie_partido, puntos_local, puntos_visitante }) => ({ partido_numero, ronda, llave, serie_partido, puntos_local, puntos_visitante })))} generation=${JSON.stringify(generation)} persisted=${JSON.stringify(persisted)} selector=${JSON.stringify(selectorOptions)} state=${JSON.stringify(stateText)} status=${JSON.stringify(await page.locator("#circuit-status").textContent())} errors=${JSON.stringify(errors)}`);
  }
  stage("Top 6 generado");
  // Top 6 uses two-game global repechage series: two series, four pending matches.
  await expect(page.locator("#pg-playoff-match option")).toHaveCount(5);
  await playoffResult(page, 80, 70); await playoffResult(page, 79, 68); await playoffResult(page, 78, 69); await playoffResult(page, 77, 66);
  await expect(page.locator("#pg-playoff-match option")).toHaveCount(1); stage("repechaje listo"); await page.locator("#pg-playoff-advance").click(); await expect(page.locator("#circuit-status")).toContainText("Avance de playoff confirmado"); stage("semifinales generadas");
  await playoffResult(page, 81, 70); await playoffResult(page, 78, 69); await page.locator("#pg-playoff-advance").click(); stage("final generada"); await playoffResult(page, 85, 77); await page.locator("#pg-playoff-advance").click(); await expect(page.locator("#pg-playoff-state")).toContainText("Campeón:"); const champion = await page.locator("#pg-playoff-state").textContent(); stage("campeón confirmado");
  await page.reload(); await page.getByRole("button", { name: "Asociación" }).click(); await expect(page.locator("#pg-playoff-state")).toContainText("Campeón:"); expect(await page.locator("#pg-playoff-state").textContent()).toContain(champion.match(/Campeón:[^\n]+/)?.[0] || "Campeón:"); expect(errors).toEqual([]); stage("recuperación lista");
});
