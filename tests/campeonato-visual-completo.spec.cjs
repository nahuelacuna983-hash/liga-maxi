const { test, expect } = require('@playwright/test');

test('administra un campeonato nuevo desde controles visibles hasta el campeón', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/demo_circuito_2027.html');
  await page.getByRole('button', { name: 'Asociación' }).click();
  await page.getByRole('button', { name: 'Torneos' }).click();
  await page.getByPlaceholder('Nombre').fill('Campeonato visual 2027');
  await page.getByRole('button', { name: 'Crear torneo' }).click();
  await page.getByRole('button', { name: 'Competencia' }).click();
  await page.getByPlaceholder('ID categoría').fill('visual-cat');
  await page.getByPlaceholder('Nombre categoría').fill('Maxi Visual');
  await page.getByRole('button', { name: 'Crear categoría' }).click();
  for (const team of ['Águilas', 'Cóndores', 'Halcones', 'Leones']) {
    await page.getByPlaceholder('Equipo').fill(team);
    await page.getByRole('button', { name: 'Agregar equipo' }).click();
  }
  await page.getByRole('button', { name: 'Generar o regenerar fixture' }).click();
  await expect(page.locator('#view-association span').filter({ hasText: 'Halcones vs Leones' })).toBeVisible();
  await page.locator('#visual-schedule-match').selectOption({ index: 1 });
  await page.locator('#visual-schedule-date').fill('2027-05-16');
  await page.locator('#visual-schedule-time').fill('20:00');
  await page.locator('#visual-schedule-court').fill('Central');
  await page.getByRole('button', { name: 'Reprogramar' }).click();
  await expect(page.getByText(/Historial: 1 cambio/)).toBeVisible();
  await page.getByRole('button', { name: 'Administración' }).click();
  await page.getByPlaceholder('ID delegado').fill('delegado-visual');
  await page.getByRole('button', { name: 'Crear delegado' }).click();
  await page.locator('#view-association input').nth(1).fill('Águilas');
  await page.locator('#view-association input').nth(2).fill('visual-cat');
  await page.locator('#delegate-permission-target').selectOption('delegado-visual');
  await page.getByRole('button', { name: 'Guardar alcance' }).click();
  await page.getByRole('button', { name: 'Delegados' }).click();
  await page.locator('#active-delegate').selectOption('delegado-visual');
  await page.waitForTimeout(100);
  await expect(page.getByText('Delegado ficticio')).toBeVisible();
  const ownMatch = page.locator('input[name="circuit-match"]').first();
  await ownMatch.check();
  await page.locator('#circuit-local').fill('70');
  await page.locator('#circuit-away').fill('60');
  await page.getByRole('button', { name: 'Cargar resultado' }).click();
  await expect(page.getByText('Resultado cargado por delegado')).toBeVisible();
  await page.getByRole('button', { name: 'Asociación' }).click();
  await page.getByRole('button', { name: 'Competencia' }).click();
  const regular = page.locator('#regular-match');
  for (let i = 0; i < 5; i++) {
    await regular.selectOption({ index: 1 });
    await page.locator('#regular-local').fill('80');
    await page.locator('#regular-away').fill('70');
    await page.getByRole('button', { name: 'Cargar resultado' }).click();
    await page.getByRole('button', { name: 'Competencia' }).click();
  }
  await page.getByRole('button', { name: 'Público' }).click();
  await expect(page.getByText('PTS')).toBeVisible();
  await page.getByRole('button', { name: 'Asociación' }).click();
  await page.getByRole('button', { name: 'Competencia' }).click();
  await page.locator('#visual-playoff-top').selectOption('4');
  await page.locator('#visual-playoff-games').selectOption('1');
  await page.getByRole('button', { name: 'Generar llaves' }).click();
  for (let i = 0; i < 2; i++) {
    await page.locator('#playoff-match').selectOption({ index: 1 });
    await page.locator('#playoff-local').fill('90');
    await page.locator('#playoff-away').fill('80');
    await page.getByRole('button', { name: 'Cargar playoff' }).click();
    await page.getByRole('button', { name: 'Competencia' }).click();
  }
  await page.getByRole('button', { name: 'Avanzar ronda' }).click();
  await expect(page.getByText(/final/i).first()).toBeVisible();
  await page.locator('#playoff-match').selectOption({ index: 1 });
  await page.locator('#playoff-local').fill('88');
  await page.locator('#playoff-away').fill('77');
  await page.getByRole('button', { name: 'Cargar playoff' }).click();
  await page.getByRole('button', { name: 'Competencia' }).click();
  await page.getByRole('button', { name: 'Avanzar ronda' }).click();
  await expect(page.locator('[aria-label="Campeón confirmado"]')).toBeVisible();
});

test('no permite avanzar playoffs sin resultados', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/demo_circuito_2027.html');
  await page.getByRole('button', { name: 'Asociación' }).click();
  await page.getByRole('button', { name: 'Competencia' }).click();
  await page.getByRole('button', { name: 'Preparar playoffs' }).click();
  await page.getByRole('button', { name: 'Avanzar ronda' }).click();
  await expect(page.locator('#circuit-status')).toContainText(/pendiente|faltan/i);
});
