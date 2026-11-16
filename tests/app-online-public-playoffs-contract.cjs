const fs = require("node:fs");

const source = fs.readFileSync("app_online.js", "utf8");

for (const fragment of [
  "await cargarResultadosPlayoffCategoria(nombreCategoria, true);",
  "function obtenerCampeonPlayoff(partidos)",
  "Campeón de playoffs",
  "cargas.push(cargarResultadosPlayoffCategoria(nombreCategoria, true));",
  "await renderPublicoCategoria(nombreCategoria);",
  "if (actualizarPublico) await renderPublicoCategoria(nombreCategoria);",
  "elemento.dataset.renderState = \"ready\"",
  "if (clasificados === 4 && cantidadEquipos >= 4)",
  "renderPlayoffMatchGuardado(\"Final\", final1"
]) {
  if (!source.includes(fragment)) {
    throw new Error(`Falta el contrato de playoffs públicos: ${fragment}`);
  }
}

console.log("APDB_APP_ONLINE_PUBLIC_PLAYOFFS_CONTRACT_OK");
