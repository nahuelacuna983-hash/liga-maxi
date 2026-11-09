const { test, expect } = require('@playwright/test');

const base = process.env.POSTGRES_UI_BASE_URL;
const fixture = {
  player: process.env.DOC_PLAYER_ID,
  team: process.env.DOC_TEAM_ID,
  requirement: process.env.DOC_REQUIREMENT || 'Apto físico',
};
test.skip(!base || !fixture.player || !fixture.team, 'Requiere PostgreSQL 16, servidor autenticado y fixture documental sintético.');

test('presenta y revisa documentación persistente desde Chromium', async ({ page }) => {
  const documentId = crypto.randomUUID();
  await page.goto(base);
  await page.getByRole('button', { name: 'Asociación' }).click();
  await page.locator('#pg-login-user').fill('dev-organizer');
  await page.locator('#pg-login').click();
  await expect(page.locator('#circuit-status')).toContainText('Sesión de desarrollo iniciada');
  await page.locator('#pg-requirement-id').fill(crypto.randomUUID());
  await page.locator('#pg-requirement-name').fill(fixture.requirement);
  await page.locator('#pg-player-team').fill(fixture.team);
  await page.locator('#pg-requirement-save').click();
  await expect(page.locator('#circuit-status')).toContainText('Requisito documental confirmado');
  await page.locator('#pg-logout').click();
  await page.locator('#pg-login-user').fill('dev-delegate');
  await page.locator('#pg-login').click();
  await page.locator('#pg-document-id').fill(documentId);
  await page.locator('#pg-document-player').fill(fixture.player);
  await page.locator('#pg-document-requirement').fill(fixture.requirement);
  await page.locator('#pg-document-evidence').fill('evidencia-browser-sintetica.pdf');
  await page.locator('#pg-document-submit').click();
  await expect(page.locator('#circuit-status')).toContainText('Presentación documental confirmada');
  await page.locator('#pg-logout').click();
  await page.locator('#pg-login-user').fill('dev-organizer');
  await page.locator('#pg-login').click();
  await page.locator('#pg-review-document-id').fill(documentId);
  await page.locator('#pg-review-player').fill(fixture.player);
  await page.locator('#pg-review-team').fill(fixture.team);
  await page.locator('#pg-review-requirement').fill(fixture.requirement);
  await page.locator('#pg-document-status').selectOption('approved');
  await page.locator('#pg-review-evidence').fill('revision-browser-sintetica.pdf');
  await page.locator('#pg-document-review').click();
  await expect(page.locator('#circuit-status')).toContainText('Revisión documental registrada');
  await expect(page.locator('#pg-document-state')).toContainText('Documentos recuperados: 1');
  await expect(page.locator('#pg-document-state')).toContainText('Historial: 2');
  await page.reload();
  await expect(page.locator('#circuit-status')).toContainText('PostgreSQL local conectado');
});
