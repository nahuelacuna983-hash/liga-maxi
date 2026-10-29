const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const vm = require('node:vm');
const { createServer } = require('./smoke-server');

const root = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(root, 'app_online.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index_online.html'), 'utf8');
const rlsProposal = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20261029_restrict_partidos_write_by_permission.sql'), 'utf8');

function extract(start, end) {
  const from = appSource.indexOf(`function ${start}`);
  const endIndex = appSource.indexOf(`function ${end}`, from);
  const to = appSource.lastIndexOf('\n', endIndex);
  assert(from >= 0 && to > from, `No se pudo extraer ${start}`);
  return appSource.slice(from, to);
}

function loadDomainFunctions() {
  const context = { Set, Object, Array, Number, Math, Intl, normalizarTexto: (value) => String(value || '').trim().toLowerCase() };
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
  assert.match(validarMarcadorResultadoNormal(-1, 70), /números válidos/);
  assert.match(validarMarcadorResultadoNormal(Number.NaN, 70), /números válidos/);
  assert.match(validarMarcadorResultadoNormal(undefined, 70), /números válidos/);
  assert.match(appSource.slice(appSource.indexOf('function resultadoPartidoLabel'), appSource.indexOf('function renderPartidoResultadoHtml')), /administrativo_sin_puntos/);
  const labelContext = { Number };
  labelContext.esResolucionAdministrativa = (partido) => ['resolucion_local', 'resolucion_visitante'].includes(partido.estado_resultado);
  vm.createContext(labelContext);
  vm.runInContext(extract('partidoTieneResultado', 'renderPartidoResultadoHtml'), labelContext);
  assert.equal(labelContext.resultadoPartidoLabel({ puntos_local: 0, puntos_visitante: 0, estado_resultado: 'administrativo_sin_puntos' }), '0 - 0 (administrativo, sin puntos)');
}

function testDelegateWriteGuard() {
  const context = { Set, normalizarTexto: (value) => String(value || '').trim().toLowerCase() };
  vm.createContext(context); vm.runInContext(extract('delegadoPuedeEditarPartido', 'claveCachePublica'), context);
  const delegado = { categorias: ['Maxi +35 A'], equipos: ['Equipo A'] };
  assert.equal(context.delegadoPuedeEditarPartido({ local: 'Equipo A', visitante: 'Equipo B' }, 'Maxi +35 A', delegado), true);
  assert.equal(context.delegadoPuedeEditarPartido({ local: 'Equipo B', visitante: 'Equipo C' }, 'Maxi +35 A', delegado), false);
  assert.equal(context.delegadoPuedeEditarPartido({ local: 'Equipo A', visitante: 'Equipo B' }, 'Maxi +35 B', delegado), false);
  assert.match(appSource.slice(appSource.indexOf('async function guardarResultadoDelegado'), appSource.indexOf('async function subirDocumentoDelegado')), /delegadoPuedeEditarPartido/);
  assert.match(appSource.slice(appSource.indexOf('async function guardarResultadoDelegado'), appSource.indexOf('async function subirDocumentoDelegado')), /guardarResultadoPartidoAutorizado/);
  assert.match(appSource.slice(appSource.indexOf('async function guardarResultadoAsociacion'), appSource.indexOf('async function resolverPartidoAdministrativamente')), /guardarResultadoPartidoAutorizado/);
  assert.match(rlsProposal, /to authenticated/i);
  assert.match(rlsProposal, /auth\.uid\(\)/i);
  assert.match(rlsProposal, /p\.can_load_results and p\.equipo_id in/i);
  assert.match(rlsProposal, /p\.can_correct_results and p\.equipo_id is null/i);
  assert.doesNotMatch(rlsProposal, /to anon/i);
}

function testFixtureAndPlayoffRules() {
  const helperSource = extract('generarRondaRobinPlanner', 'generarFixtureSimuladoPlanner') + extract('generarFixtureSimuladoPlanner', 'siguienteFechaLibrePlanner') + extract('siguienteFechaLibrePlanner', 'completarFechasPlayoffSimuladasPlanner');
  const context = { Date, Map, Set, Array, Number, Math, fechaLocalPlanner: (value) => value ? new Date(`${value}T12:00:00`) : null, fechaKeyPlanner: (value) => value.toISOString().slice(0, 10), sumarDiasPlanner: (value, days) => new Date(value.getTime() + days * 86400000), siguienteDiaJuegoPlanner: (value, day) => { const date = new Date(`${value}T12:00:00`); while (date.getDay() !== Number(day)) date.setDate(date.getDate() + 1); return date; } };
  vm.createContext(context); vm.runInContext(helperSource, context);
  const blocked = new Set(['2026-11-08']);
  const fixture = context.generarFixtureSimuladoPlanner(['A', 'B', 'C'], 1, '2026-11-01', 0, blocked, '2026-12-31');
  assert.equal(fixture.jornadas.length, 3); assert.equal(fixture.jornadas.some((j) => j.fecha === '2026-11-08'), false); assert.equal(fixture.bloqueosSalteados, 1);
  assert.equal(context.siguienteFechaLibrePlanner(new Date('2026-11-01T12:00:00'), blocked).toISOString().slice(0, 10), '2026-11-15');
  for (const [count, ruedas] of [[6, 1], [6, 2], [10, 1], [10, 2]]) {
    const names = Array.from({ length: count }, (_, index) => `E${index + 1}`);
    const generated = context.generarFixtureSimuladoPlanner(names, ruedas, '2026-03-01', 0, new Set(), '2026-12-31');
    const pairs = new Set();
    generated.jornadas.forEach((jornada) => {
      const seen = new Set();
      jornada.partidos.forEach((partido) => {
        assert.equal(seen.has(partido.local), false); assert.equal(seen.has(partido.visitante), false);
        seen.add(partido.local); seen.add(partido.visitante);
        pairs.add([partido.local, partido.visitante].sort().join('|'));
      });
      assert.equal(seen.size + (jornada.libre ? 1 : 0), count);
    });
    assert.equal(pairs.size, (count * (count - 1)) / 2);
    assert.equal(generated.jornadas.length, (count - 1) * ruedas);
  }
  assert.equal(context.siguienteDiaJuegoPlanner('2026-03-04', 3).getDay(), 3); // miércoles (+48
  assert.equal(context.siguienteDiaJuegoPlanner('2026-03-01', 0).getDay(), 0); // domingo (+35
}

function testRoleRules() {
  const context = { Set, DELEGADOS: { admin123: { rol: 'admin' } } }; vm.createContext(context); vm.runInContext(extract('delegadoDesdePermisos', 'reconciliarDelegadoConCategoriasActuales'), context);
  const delegado = context.delegadoDesdePermisos([{ role: 'delegado', display_name: 'Delegado Test', categoria_nombre: 'Maxi +35 A', equipo_nombre: 'Equipo A' }, { role: 'delegado', display_name: 'Delegado Test', categoria_nombre: 'Maxi +35 A', equipo_nombre: 'Equipo A' }]);
  assert.deepEqual(Array.from(delegado.categorias), ['Maxi +35 A']); assert.deepEqual(Array.from(delegado.equipos), ['Equipo A']); assert.equal(context.delegadoDesdePermisos([{ role: 'otro' }], null), null);
}

function testPlayoffFormats() {
  const context = { Array, Number };
  vm.createContext(context);
  vm.runInContext(extract('fechasSerieValoresPlanner', 'guardarFormatoCategoriaPublicadaPlanner'), context);
  const formato8 = context.armarSeriesPlayoffCategoriaPlanner({ clasificados: 8, partidosCuartos: 1, partidosSemis: 1, partidosFinal: 3, fechaCuartos: '2027-06-06', fechaSemis: '2027-06-13', fechaFinal1: '2027-06-20', fechaFinal2: '2027-06-27', fechaFinal3: '2027-07-04' });
  assert.equal(formato8.cuartos.partidos, 1); assert.deepEqual(Array.from(formato8.final.fechas), ['2027-06-20', '2027-06-27', '2027-07-04']);
  const formato6 = context.armarSeriesPlayoffCategoriaPlanner({ clasificados: 6, partidosCuartos: 2, partidosSemis: 2, partidosFinal: 2, fechaCuartos: '2027-06-06', fechaCuartos2: '2027-06-13', fechaSemis: '2027-06-20', fechaSemis2: '2027-06-27', fechaFinal1: '2027-07-04', fechaFinal2: '2027-07-11' });
  assert.equal(formato6.repechaje.partidos, 2); assert.deepEqual(Array.from(formato6.semifinales.fechas), ['2027-06-20', '2027-06-27']);
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

(async () => { testDomainLogic(); testDelegateWriteGuard(); testFixtureAndPlayoffRules(); testPlayoffFormats(); testRoleRules(); await testInterfaceSourceAndServer(); console.log('ISSUE1_SMOKE_OK'); })().catch((error) => { console.error(`ISSUE1_SMOKE_FAIL: ${error.stack || error.message}`); process.exitCode = 1; });
