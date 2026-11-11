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

test('inscribe un jugador y conserva el historial documental visible', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/demo_circuito_2027.html');
  await page.getByRole('button', { name: 'Asociación' }).click();
  await page.getByRole('button', { name: 'Documentación' }).click();
  await page.getByPlaceholder('ID ficticio').fill('jugador-demo-1');
  await page.getByPlaceholder('Nombre ficticio').fill('Martín Demo');
  await page.getByRole('button', { name: 'Inscribir jugador' }).click();
  await page.getByPlaceholder('Requisito documental').fill('Apto físico');
  await page.getByRole('combobox').filter({ has: page.locator('option[value="observado"]') }).selectOption('observado');
  await page.getByPlaceholder('Archivo o evidencia sintética').fill('apto-demo.pdf');
  await page.getByRole('button', { name: 'Registrar auditoría' }).click();
  await expect(page.getByText('Apto físico: observado · apto-demo.pdf')).toBeVisible();
  await page.getByPlaceholder('Requisito documental').fill('Apto físico');
  await page.getByRole('combobox').filter({ has: page.locator('option[value="observado"]') }).selectOption('aprobado');
  await page.getByPlaceholder('Archivo o evidencia sintética').fill('apto-demo.pdf');
  await page.getByRole('button', { name: 'Registrar auditoría' }).click();
  await expect(page.locator('.status-pill', { hasText: 'PENDIENTE' })).toBeVisible();
  await expect(page.getByText('Apto físico: aprobado · apto-demo.pdf')).toBeVisible();
  await page.getByPlaceholder('Requisito documental').fill('Lista de buena fe');
  await page.getByRole('combobox').filter({ has: page.locator('option[value="observado"]') }).selectOption('aprobado');
  await page.getByPlaceholder('Archivo o evidencia sintética').fill('lista-demo.pdf');
  await page.getByRole('button', { name: 'Registrar auditoría' }).click();
  await expect(page.locator('.status-pill', { hasText: 'DOCUMENTACIÓN COMPLETA' })).toBeVisible();
});
