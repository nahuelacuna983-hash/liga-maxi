const assert = require("assert");
const fs = require("fs");
const fixture = require("../demo_2027_fixture.js");
const source = fs.readFileSync("app_online.js", "utf8");
const start = source.indexOf("function generarRondaRobinPlanner(");
const brace = source.indexOf("{", start); let depth = 0; let end = brace;
for (; end < source.length; end++) { if (source[end] === "{") depth++; else if (source[end] === "}" && --depth === 0) break; }
const original = new Function(`${source.slice(start, end + 1)}; return generarRondaRobinPlanner;`)();
for (const count of [4, 5, 6, 7, 10]) {
  const teams = Array.from({ length: count }, (_, index) => `Equipo ${index + 1}`);
  const expected = original(teams).map((round) => ({ libre: round.libre, partidos: round.partidos }));
  const actual = fixture.generateRoundRobin(teams);
  assert.deepStrictEqual(actual, expected, `round-robin divergence for ${count}`);
}
console.log("DEMO_PLANNER_EQUIVALENCE_OK");
