const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("app_online.js", "utf8");
const start = source.indexOf("function calcularEstadoHabilitacionJugador(");
const end = source.indexOf("\nfunction calcularHabilitadosCategoria(", start);
assert.ok(start >= 0 && end > start, "Falta el cálculo de habilitación");

const declarations = source.slice(start, end);
const context = {
  buscarDocumentoEquipoPorTerminos: () => ({ ok: true }),
  buscarDocumentoJugadorPorTerminos: () => ({ ok: true }),
  evaluarDocumentoPreauditoria: () => ({ estado: "aprobado", detalle: "" }),
  combinarPreauditoriaDocumental: () => ({ estado: "aprobado", detalle: "" }),
  siNoDocumento: () => "SI",
  temporadaDocumentalActiva: () => "2027",
  estado: { categorias: [{ id: "test-category", nombre: "Sintética" }], decisionesDeportivasPorCategoriaId: {} },
};
vm.createContext(context);
vm.runInContext(declarations, context);

const player = { id: "synthetic-player", equipo_nombre: "Equipo Sintético" };
const valid2027 = context.calcularEstadoHabilitacionJugador("Sintética", player);
assert.equal(valid2027.documentacionCompleta, true);
assert.equal(valid2027.habilitado, "NO", "Documentación completa no implica habilitación 2027");
assert.equal(valid2027.estadoHabilitacionDeportiva, "PENDIENTE_DECISION");
assert.match(valid2027.faltantes, /decisión institucional/);

context.estado.decisionesDeportivasPorCategoriaId["test-category"] = {
  [player.id]: { status: "habilitado" }
};
const approved2027 = context.calcularEstadoHabilitacionJugador("Sintética", player);
assert.equal(approved2027.habilitado, "SI");
assert.equal(approved2027.estadoHabilitacionDeportiva, "HABILITADO_INSTITUCIONAL");
context.estado.decisionesDeportivasPorCategoriaId["test-category"][player.id] = { status: "suspendido" };
const suspended2027 = context.calcularEstadoHabilitacionJugador("Sintética", player);
assert.equal(suspended2027.habilitado, "NO");
assert.equal(suspended2027.estadoHabilitacionDeportiva, "SUSPENDIDO");

context.temporadaDocumentalActiva = () => "2026";
const legacy2026 = context.calcularEstadoHabilitacionJugador("Sintética", player);
assert.equal(legacy2026.habilitado, "SI", "No alterar compatibilidad histórica 2026");

context.temporadaDocumentalActiva = () => "2027";
context.siNoDocumento = () => "NO";
const incomplete2027 = context.calcularEstadoHabilitacionJugador("Sintética", player);
assert.equal(incomplete2027.documentacionCompleta, false);
assert.equal(incomplete2027.habilitado, "NO");
assert.equal(incomplete2027.estadoHabilitacionDeportiva, "DOCUMENTACION_INCOMPLETA");
console.log("APDB_2027_ELIGIBILITY_SEPARATION_OK");
