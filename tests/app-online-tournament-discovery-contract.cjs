const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("app_online.js", "utf8");
assert.match(source, /torneosConContenido/);
assert.match(source, /\["borrador", "activo", "publicado", "en_juego"\]/);
assert.match(source, /contarPartidosTorneo\(candidato\.id\)/);
assert.match(source, /torneo = candidato/);
console.log("APDB_APP_ONLINE_TOURNAMENT_DISCOVERY_OK");
