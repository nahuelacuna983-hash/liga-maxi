"use strict";
const assert = require("node:assert/strict");
const Provider = require("../demo_2027_provider.js");
const provider = new Provider();
provider.registerPlayer("asoc-demo", { id: "status-player", nombre: "Jugadora estados", equipo: "Femenino Norte", categoria: "femenino" });
provider.setDocumentRequirements("asoc-demo", "femenino", "Femenino Norte", ["Apto físico"]);
for (const [status, expected] of [["cargado", "revision_humana_pendiente"], ["observado", "revision_humana_pendiente"], ["rechazado", "revision_humana_pendiente"], ["vencido", "revision_humana_pendiente"]]) {
  provider.setDocumentStatus("asoc-demo", "status-player", "Apto físico", status, `${status}-sintetico`);
  assert.equal(provider.getPlayerEligibility("asoc-demo", "status-player"), expected);
}
provider.setDocumentStatus("asoc-demo", "status-player", "Apto físico", "aprobado", "aprobado-sintetico");
assert.equal(provider.getPlayerEligibility("asoc-demo", "status-player"), "documentacion_completa");
assert.equal(provider.getDocumentHistory("asoc-demo", "status-player").length, 5);
console.log("DEMO_DOCUMENTATION_STATUSES_OK");
