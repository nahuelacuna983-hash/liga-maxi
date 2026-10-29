const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const sports = require("../demo_2027_sports.js");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`missing ${name}`);
  const brace = source.indexOf("{", start);
  let depth = 0; let quote = null; let escaped = false;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    if (quote) { if (escaped) escaped = false; else if (ch === "\\") escaped = true; else if (ch === quote) quote = null; continue; }
    if (ch === "\"" || ch === "'" || ch === "`") { quote = ch; continue; }
    if (ch === "{") depth++;
    if (ch === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`unclosed ${name}`);
}

const source = fs.readFileSync("app_online.js", "utf8");
const names = ["partidoTieneResultado", "esResolucionAdministrativa", "esResultadoAdministrativoSinPuntos", "calcularMiniTablaOlimpica", "compararEquiposTabla", "calcularTabla", "partidoPlayoffTieneResultado", "ganadorPartidoPlayoff", "ganadorSeriePlayoff"];
const code = names.map((name) => extractFunction(source, name)).join("\n") + "\nreturn { calcularTabla, calcularMiniTablaOlimpica, ganadorPartidoPlayoff, ganadorSeriePlayoff };";
const original = new Function(code)();

const cases = [
  [
    { local: "Banco Provincia", visitante: "Estrella de Berisso", puntos_local: 53, puntos_visitante: 62, estado_resultado: "jugado" },
    { local: "Banco Provincia", visitante: "Universal", puntos_local: 57, puntos_visitante: 40, estado_resultado: "jugado" },
    { local: "Estrella de Berisso", visitante: "Universal", puntos_local: 44, puntos_visitante: 56, estado_resultado: "jugado" },
  ],
  [
    { local: "A", visitante: "B", puntos_local: 0, puntos_visitante: 0, estado_resultado: "administrativo_sin_puntos" },
    { local: "B", visitante: "C", puntos_local: 20, puntos_visitante: 0, estado_resultado: "resolucion_local" },
  ],
];
for (const matches of cases) {
  assert.deepStrictEqual(sports.calcularTabla(matches), original.calcularTabla(matches), "table divergence");
  assert.deepStrictEqual(sports.calcularMiniTablaOlimpica([...new Set(matches.flatMap((match) => [match.local, match.visitante]))], matches), original.calcularMiniTablaOlimpica([...new Set(matches.flatMap((match) => [match.local, match.visitante]))], matches), "mini-table divergence");
}
const playoff = [
  { llave: "q1", local: "A", visitante: "B", puntos_local: 80, puntos_visitante: 70 },
  { llave: "q1", local: "B", visitante: "A", puntos_local: 60, puntos_visitante: 75 },
];
assert.strictEqual(sports.ganadorPartidoPlayoff(playoff[0]), original.ganadorPartidoPlayoff(playoff[0]));
assert.strictEqual(sports.ganadorSerieGlobal(playoff, "q1"), original.ganadorSeriePlayoff(playoff, "q1"));
console.log("DEMO_2027_EQUIVALENCE_OK");
