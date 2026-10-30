const { test, expect } = require('@playwright/test');

test('recorre Asociación hasta campeón sin solicitudes remotas', async ({ page }) => {
  const external = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4173')) external.push(request.url());
  });
  await page.goto('http://127.0.0.1:4173/demo_circuito_2027.html');
  await page.getByRole('button', { name: 'Asociación' }).click();
  await page.getByRole('button', { name: 'Competencia' }).click();
  await expect(page.getByRole('button', { name: 'Simular campeonato completo' })).toBeVisible();
  await page.getByRole('button', { name: 'Simular campeonato completo' }).click();
  await expect(page.getByRole('heading', { name: 'Público' })).toBeVisible();
  await expect(page.getByLabel('Campeón confirmado')).toBeVisible();
  await expect(page.getByText('Estado: finalizado')).toBeVisible();
  expect(external).toEqual([]);
});

test('la vista de campeón conserva legibilidad móvil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4173/demo_circuito_2027.html');
  await page.getByRole('button', { name: 'Asociación' }).click();
  await page.getByRole('button', { name: 'Competencia' }).click();
  await page.getByRole('button', { name: 'Simular campeonato completo' }).click();
  await expect(page.getByLabel('Campeón confirmado')).toBeVisible();
  await page.screenshot({ path: 'test-results/circuit-champion-mobile.png', fullPage: true });
});
