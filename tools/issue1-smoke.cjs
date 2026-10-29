const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const vm = require('node:vm');
const { createServer } = require('./smoke-server');

const root = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(root, 'app_online.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index_online.html'), 'utf8');

function extract(start, end) {
  const from = appSource.indexOf(`function ${start}`);
  const to = appSource.indexOf(`function ${end}`, from);
  assert(from >= 0 && to > from, `No se pudo extraer ${start}`);
  return appSource.slice(from, to);
}

function loadDomainFunctions() {
  const context = {
    Set,
    Object,
    Array,
    Number,
    Math,
    Intl,
    compararEquiposTabla: undefined,
    partidoTieneResultado: (p) => p.estado_resultado === 'jugado' || p.estado_resultado === 'resolucion_local' || p.estado_resultado === 'resolucion_visitante',
    esResolucionAdministrativa: (p) => p.estado_resultado === 'resolucion_local' || p.estado_resultado === 'resolucion_visitante',
  };
  vm.createContext(context);
  vm.runInContext(extract('calcularTabla', 'compararEquiposTabla') + extract('compararEquiposTabla', 'calcularMiniTablaOlimpica') + extract('calcularMiniTablaOlimpica', 'renderTablaSimple'), context);
  return context;
}

function testDomainLogic() {
  const { calcularTabla, calcularMiniTablaOlimpica } = loadDomainFunctions();
  const normal = calcularTabla([{ local: 'A', visitante: 'B', puntos_local: 70, puntos_visitante: 60, estado_resultado: 'jugado' }]);
  assert.deepEqual(normal.map(({ equipo, pj, pg, pp, pts }) => ({ equipo, pj, pg, pp, pts })), [
    { equipo: 'A', pj: 1, pg: 1, pp: 0, pts: 2 },
    { equipo: 'B', pj: 1, pg: 0, pp: 1, pts: 1 },
  ]);

  const tie = calcularTabla([{ local: 'A', visitante: 'B', puntos_local: 60, puntos_visitante: 60, estado_resultado: 'jugado' }]);
  assert.equal(tie[0].pts, 1);
  assert.equal(tie[1].pts, 1);

  const admin = calcularMiniTablaOlimpica(['A', 'B'], [{ local: 'A', visitante: 'B', puntos_local: 0, puntos_visitante: 0, estado_resultado: 'resolucion_local' }]);
  assert.equal(admin.A.pts, 2);
  assert.equal(admin.B.pts, 0);
}

function request(port, requestPath) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path: requestPath }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
  });
}

async function testServer() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  try {
    const page = await request(port, '/index_online.html?categoria=Maxi%20%2B35%20A');
    assert.equal(page.status, 200);
    assert.match(page.body, /id="publico-categoria"/);
    assert.match(page.body, /id="publico-fixture"/);
    assert.match(page.body, /id="publico-tabla-wrap"/);
    assert.match(page.body, /id="tab-delegados"/);
    assert.match(page.body, /id="tab-asociacion"/);

    const malformed = await request(port, '/%E0%A4%A');
    assert.equal(malformed.status, 400);
    const traversal = await request(port, '/..%2Fapp_online.js');
    assert.equal(traversal.status, 403);
    const afterErrors = await request(port, '/manifest.json');
    assert.equal(afterErrors.status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

(async () => {
  testDomainLogic();
  await testServer();
  console.log('ISSUE1_SMOKE_OK');
})().catch((error) => {
  console.error(`ISSUE1_SMOKE_FAIL: ${error.message}`);
  process.exitCode = 1;
});
