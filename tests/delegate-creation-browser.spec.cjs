const { test, expect } = require('@playwright/test');

test('crea y expone un delegado en Administración', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/demo_circuito_2027.html');
  await page.getByRole('button', { name: 'Asociación' }).click();
  await page.getByRole('button', { name: 'Administración' }).click();
  await page.getByPlaceholder('ID delegado').fill('delegado-visual');
  await page.getByRole('button', { name: 'Crear delegado' }).click();
  await expect(page.locator('#circuit-status')).toHaveText('Delegado creado en memoria.');
  await expect(page.locator('#delegate-permission-target option[value="delegado-visual"]')).toHaveCount(1);
});
