const assert = require("assert");
const sports = require("../demo_2027_sports.js");

assert.throws(() => sports.validateNormalResult(58, 58), /no puede terminar empatado/);
assert.strictEqual(sports.validateNormalResult(58, 54), true);

const teams = ["Banco Provincia", "Estrella de Berisso", "Universal"];
const tripleTie = [
  { local: teams[0], visitante: teams[1], puntos_local: 60, puntos_visitante: 50, estado_resultado: "jugado" },
  { local: teams[1], visitante: teams[2], puntos_local: 70, puntos_visitante: 60, estado_resultado: "jugado" },
  { local: teams[2], visitante: teams[0], puntos_local: 80, puntos_visitante: 70, estado_resultado: "jugado" },
];
const table = sports.calcularTabla(tripleTie);
assert.deepStrictEqual(table.map((team) => team.pts), [3, 3, 3]);
assert.deepStrictEqual(table.map((team) => team.equipo), ["Universal", "Banco Provincia", "Estrella de Berisso"]);

const admin = sports.calcularTabla([{ local: "A", visitante: "B", puntos_local: 0, puntos_visitante: 0, estado_resultado: "administrativo_sin_puntos" }]);
assert.deepStrictEqual(admin.map((team) => [team.pj, team.pg, team.pp, team.pts]), [[1, 0, 0, 0], [1, 0, 0, 0]]);
assert.strictEqual(sports.ganadorPartidoPlayoff({ local: "A", visitante: "B", puntos_local: 80, puntos_visitante: 72 }), "A");
assert.strictEqual(sports.ganadorSerieGlobal([
  { llave: "q1", local: "A", visitante: "B", puntos_local: 80, puntos_visitante: 70 },
  { llave: "q1", local: "B", visitante: "A", puntos_local: 60, puntos_visitante: 75 },
], "q1"), "A");
console.log("DEMO_2027_SPORTS_OK");
