const { test, expect } = require("@playwright/test");

test.describe("Liga Maxi 2027 demo local", () => {
  test("carga fixture sin red remota y navega tabla/resultados", async ({ page }) => {
    const requests = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.goto("http://127.0.0.1:4173/demo_2027.html");
    await expect(page.getByText("LIGA MAXI 2027 — PRUEBAS")).toBeVisible();
    await expect(page.getByText("Sud América vs Gonnet")).toBeVisible();
    await page.getByRole("button", { name: "Tabla" }).click();
    await expect(page.getByText("Tabla de posiciones")).toBeVisible();
    await expect(page.getByText("Sud América")).toBeVisible();
    await page.getByRole("button", { name: "Resultados" }).click();
    await expect(page.getByText("Resultados cargados")).toBeVisible();
    expect(requests.filter((url) => !url.startsWith("http://127.0.0.1:4173")).length).toBe(0);
  });
});
