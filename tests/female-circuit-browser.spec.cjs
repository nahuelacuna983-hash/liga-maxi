const { test, expect } = require('@playwright/test');

async function saveSelected(page, select, local, away) {
  await page.locator(select).selectOption({ index: 1 });
  await page.locator(local).fill(String(local === '#regular-local' ? 80 : 82));
  await page.locator(away).fill(String(away === '#regular-away' ? 70 : 71));
  await page.getByRole('button', { name: select === '#regular-match' ? 'Cargar resultado' : 'Cargar playoff' }).click();
}

test('recorre Femenino sintético desde Chromium sin solicitudes remotas', async ({ page }) => {
  const external = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4173')) external.push(request.url());
  });
  await page.goto('http://127.0.0.1:4173/demo_circuito_2027.html');
  await page.locator('#circuit-category').selectOption('femenino');
  await page.getByRole('button', { name: 'Asociación' }).click();
  await page.getByRole('button', { name: 'Competencia' }).click();
  await expect(page.getByText('Administración sintética de Femenino')).toBeVisible();
  await page.getByRole('button', { name: 'Generar o regenerar fixture' }).click();
  for (let i = 0; i < 6; i += 1) await saveSelected(page, '#regular-match', '#regular-local', '#regular-away');
  await expect(page.locator('#view-association')).toContainText('80 - 70');
  await page.getByRole('button', { name: 'Preparar playoffs' }).click();
  await saveSelected(page, '#playoff-match', '#playoff-local', '#playoff-away');
  await saveSelected(page, '#playoff-match', '#playoff-local', '#playoff-away');
  await page.getByRole('button', { name: 'Avanzar ronda' }).click();
  await saveSelected(page, '#playoff-match', '#playoff-local', '#playoff-away');
  await page.getByRole('button', { name: 'Avanzar ronda' }).click();
  await expect(page.getByLabel('Campeón confirmado')).toBeVisible();
  await expect(page.getByText('Liga Maxi 2027 · Femenino')).toBeVisible();
  expect(external).toEqual([]);
});
