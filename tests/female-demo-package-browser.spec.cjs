const { test, expect } = require('@playwright/test');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(process.env.FEMALE_DEMO_DIR || 'private/apdb-2027-demo-femenino-extracted');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
function startServer() {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const relative = pathname.replace(/^\/demo-femenino\/?/, '') || 'index.html';
    const target = path.resolve(root, relative);
    if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) { response.writeHead(404); return response.end(); }
    response.writeHead(200, { 'content-type': types[path.extname(target)] || 'application/octet-stream' });
    fs.createReadStream(target).pipe(response);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

test('paquete femenino aislado funciona bajo subcarpeta sin red externa', async ({ page }) => {
  const server = await startServer();
  const external = [];
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    page.on('request', (request) => { if (!request.url().startsWith(base)) external.push(request.url()); });
    page.on('requestfailed', (request) => { if (!request.url().startsWith(base)) external.push(request.url()); });
    await page.goto(`${base}/demo-femenino/`);
    await expect(page.getByRole('alert')).toHaveText('DATOS FICTICIOS - DEMOSTRACIÓN NO OFICIAL');
    const frame = page.frames()[1];
    await frame.locator('#circuit-category').selectOption('femenino');
    await frame.getByRole('button', { name: 'Asociación' }).click();
    await frame.getByRole('button', { name: 'Competencia' }).click();
    await expect(frame.getByText('Administración sintética de Femenino')).toBeVisible();
    await frame.getByRole('button', { name: 'Simular campeonato completo' }).click();
    await expect(frame.getByLabel('Campeón confirmado')).toBeVisible();
    await expect(frame.getByText('Liga Maxi 2027 · Femenino')).toBeVisible();
    expect(external).toEqual([]);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
