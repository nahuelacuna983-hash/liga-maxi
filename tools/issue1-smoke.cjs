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
  const endIndex = appSource.indexOf(`function ${end}`, from);
  const to = appSource.lastIndexOf('\n', endIndex);
  assert(from >= 0 && to > from, `No se pudo extraer ${start}`);
  return appSource.slice(from, to);
}

function loadDomainFunctions() {
  const context = { Set, Object, Array, Number, Math, Intl };
  context.partidoTieneResultado = (p) => ['jugado', 'resolucion_local', 'resolucion_visitante', 'administrativo_sin_puntos'].includes(p.estado_resultado);
  context.esResolucionAdministrativa = (p) => ['resolucion_local', 'resolucion_visitante'].includes(p.estado_resultado);
  vm.createContext(context);
  vm.runInContext(extract('validarMarcadorResultadoNormal', 'calcularTabla') + extract('calcularTabla', 'compararEquiposTabla') + extract('compararEquiposTabla', 'calcularMiniTablaOlimpica') + extract('calcularMiniTablaOlimpica', 'renderTablaSimple'), context);
  return context;
}

function testDomainLogic() {
  const { calcularTabla, calcularMiniTablaOlimpica, validarMarcadorResultadoNormal } = loadDomainFunctions();
  const normal = calcularTabla([{ local: 'A', visitante: 'B', puntos_local: 70, puntos_visitante: 60, estado_resultado: 'jugado' }]);
  assert.deepEqual(normal.map(({ equipo, pj, pg, pp, pts }) => ({ equipo, pj, pg, pp, pts })), [{ equipo: 'A', pj: 1, pg: 1, pp: 0, pts: 2 }, { equipo: 'B', pj: 1, pg: 0, pp: 1, pts: 1 }]);
  const admin = calcularTabla([{ local: 'A', visitante: 'B', puntos_local: 0, puntos_visitante: 0, estado_resultado: 'administrativo_sin_puntos' }]);
  assert.deepEqual(admin.map(({ equipo, pj, pf, pc, pts }) => ({ equipo, pj, pf, pc, pts })), [{ equipo: 'A', pj: 1, pf: 0, pc: 0, pts: 0 }, { equipo: 'B', pj: 1, pf: 0, pc: 0, pts: 0 }]);
  const mini = calcularMiniTablaOlimpica(['A', 'B'], [{ local: 'A', visitante: 'B', puntos_local: 0, puntos_visitante: 0, estado_resultado: 'administrativo_sin_puntos' }]);
  assert.equal(mini.A.pts, 0); assert.equal(mini.B.pts, 0);
  assert.equal(validarMarcadorResultadoNormal(60, 60).length > 0, true); assert.equal(validarMarcadorResultadoNormal(70, 60), '');
}

function testFixtureAndPlayoffRules() {
  const helperSource = extract('generarRondaRobinPlanner', 'generarFixtureSimuladoPlanner') + extract('generarFixtureSimuladoPlanner', 'siguienteFechaLibrePlanner') + extract('siguienteFechaLibrePlanner', 'completarFechasPlayoffSimuladasPlanner');
  const context = { Date, Map, Set, Array, Number, Math, fechaLocalPlanner: (value) => value ? new Date(`${value}T12:00:00`) : null, fechaKeyPlanner: (value) => value.toISOString().slice(0, 10), sumarDiasPlanner: (value, days) => new Date(value.getTime() + days * 86400000), siguienteDiaJuegoPlanner: (value, day) => { const date = new Date(`${value}T12:00:00`); while (date.getDay() !== Number(day)) date.setDate(date.getDate() + 1); return date; } };
  vm.createContext(context); vm.runInContext(helperSource, context);
  const blocked = new Set(['2026-11-08']);
  const fixture = context.generarFixtureSimuladoPlanner(['A', 'B', 'C'], 1, '2026-11-01', 0, blocked, '2026-12-31');
  assert.equal(fixture.jornadas.length, 3); assert.equal(fixture.jornadas.some((j) => j.fecha === '2026-11-08'), false); assert.equal(fixture.bloqueosSalteados, 1);
  assert.equal(context.siguienteFechaLibrePlanner(new Date('2026-11-01T12:00:00'), blocked).toISOString().slice(0, 10), '2026-11-15');
}

function testRoleRules() {
  const context = { Set, DELEGADOS: { admin123: { rol: 'admin' } } }; vm.createContext(context); vm.runInContext(extract('delegadoDesdePermisos', 'reconciliarDelegadoConCategoriasActuales'), context);
  const delegado = context.delegadoDesdePermisos([{ role: 'delegado', display_name: 'Delegado Test', categoria_nombre: 'Maxi +35 A', equipo_nombre: 'Equipo A' }, { role: 'delegado', display_name: 'Delegado Test', categoria_nombre: 'Maxi +35 A', equipo_nombre: 'Equipo A' }]);
  assert.deepEqual(Array.from(delegado.categorias), ['Maxi +35 A']); assert.deepEqual(Array.from(delegado.equipos), ['Equipo A']); assert.equal(context.delegadoDesdePermisos([{ role: 'otro' }], null), null);
}

function request(port, requestPath) { return new Promise((resolve, reject) => { const req = http.get({ host: '127.0.0.1', port, path: requestPath }, (res) => { let body = ''; res.setEncoding('utf8'); res.on('data', (chunk) => { body += chunk; }); res.on('end', () => resolve({ status: res.statusCode, body })); }); req.on('error', reject); }); }

async function testInterfaceSourceAndServer() {
  for (const id of ['publico-categoria', 'publico-fixture', 'publico-tabla-wrap', 'tab-delegados', 'tab-asociacion']) assert.match(html, new RegExp(`id="${id}"`));
  const server = createServer(); await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve)); const port = server.address().port;
  try {
    assert.equal((await request(port, '/')).status, 200); assert.equal((await request(port, '/index_online.html?categoria=Maxi%20%2B35%20A')).status, 200);
    for (const item of ['/.git/HEAD', '/.env', '/docs/issue-1-bloque-1.md', '/tools/smoke-server.js', '/tools/', '/..%2Fapp_online.js']) assert.equal((await request(port, item)).status, 404);
    assert.equal((await request(port, '/%E0%A4%A')).status, 400); assert.equal((await request(port, '/manifest.json')).status, 200); assert.equal((await request(port, '/style.css')).status, 200);
  } finally { await new Promise((resolve) => server.close(resolve)); }
}

(async () => { testDomainLogic(); testFixtureAndPlayoffRules(); testRoleRules(); await testInterfaceSourceAndServer(); console.log('ISSUE1_SMOKE_OK'); })().catch((error) => { console.error(`ISSUE1_SMOKE_FAIL: ${error.stack || error.message}`); process.exitCode = 1; });
