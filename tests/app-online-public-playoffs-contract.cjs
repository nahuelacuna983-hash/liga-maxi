const fs = require("node:fs");

const source = fs.readFileSync("app_online.js", "utf8");

for (const fragment of [
  "await cargarResultadosPlayoffCategoria(nombreCategoria, true);",
  "function obtenerCampeonPlayoff(partidos)",
  "Campeón de playoffs",
  "cargas.push(cargarResultadosPlayoffCategoria(nombreCategoria, true));"
]) {
  if (!source.includes(fragment)) {
    throw new Error(`Falta el contrato de playoffs públicos: ${fragment}`);
  }
}

console.log("APDB_APP_ONLINE_PUBLIC_PLAYOFFS_CONTRACT_OK");
