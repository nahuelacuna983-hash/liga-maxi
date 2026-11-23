"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("app_online.js", "utf8");
function section(startToken,endToken) {
  const start=source.indexOf(startToken);
  assert(start>=0,"Missing "+startToken);
  const end=source.indexOf(endToken,start+startToken.length);
  assert(end>start,"Missing end "+endToken);
  return source.slice(start,end);
}
const logout=section("function limpiarEstadoPrivadoAuth() {","\nasync function inicializarSesionAuth");
assert.match(logout,/estado\.sesionPrivadaVersion\s*=\s*\(estado\.sesionPrivadaVersion \|\| 0\) \+ 1/);
for (const key of ["decisionesDeportivasPorCategoriaId","candidatosHabilitacionPorCategoriaId","listadoArbitrosPorCategoriaId","listadoArbitrosErrorPorCategoriaId"]) {
  assert.match(logout,new RegExp("estado\\."+key+"\\s*=\\s*\\{\\}"));
}
for (const id of ["apdb-eligibility-history","apdb-eligibility-summary","habilitados-tabla"]) {
  assert(logout.includes('$("'+id+'")'));
}
const category=section("async function cargarDecisionesDeportivasCategoria(","\nfunction renderDecisionesDeportivasCategoria");
const official=section("async function validarListadoArbitrosParaEmision(","\nasync function exportarHabilitadosCsv");
for (const part of [category,official]) {
  assert.match(part,/const versionSesion = estado\.sesionPrivadaVersion \|\| 0/);
  assert.match(part,/const usuarioSesion = estado\.authUser\?\.id/);
  assert.match(part,/estado\.sesionPrivadaVersion \|\| 0\) !== versionSesion/);
  assert.match(part,/estado\.authUser\?\.id !== usuarioSesion/);
  const call=part.indexOf("await ");
  const guard=part.indexOf("!== versionSesion");
  assert(call>=0 && guard>call,"Session guard must run after RPC");
}
assert.match(category,/\$\("asociacion-categoria"\)\?\.value !== nombreCategoria/);
assert.match(official,/\$\("asociacion-categoria"\)\?\.value !== categoriaNombre/);
console.log("APDB_2027_SESSION_RPC_RACE_CONTRACT_OK");
