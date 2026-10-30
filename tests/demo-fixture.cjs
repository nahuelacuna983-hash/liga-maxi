const assert = require("assert");
const fixture = require("../demo_2027_fixture.js");
const result = fixture.generateFixture(["A", "B", "C", "D"], "2027-04-05", ["2027-04-12"]);
assert.strictEqual(result.rounds, 3);
assert.strictEqual(result.matches.length, 6);
assert.ok(result.matches.every((match) => match.estado_resultado === "pendiente"));
assert.ok(result.matches.every((match) => match.fecha !== "2027-04-12"));
assert.strictEqual(new Set(result.matches.map((match) => `${match.local}-${match.visitante}`)).size, 6);
for (const count of [4, 6, 10]) {
  const teams = Array.from({ length: count }, (_, index) => `Equipo ${index + 1}`);
  const oneWheel = fixture.generateFixture(teams, "2027-04-05", [], 1, 1, 0);
  assert.strictEqual(oneWheel.matches.length, count * (count - 1) / 2);
  assert.strictEqual(oneWheel.jornadas.length, count - 1);
}
const twoWheels = fixture.generateFixture(["A", "B", "C", "D"], "2027-04-07", [], 1, 2, 3);
assert.strictEqual(twoWheels.matches.length, 12);
assert.ok(twoWheels.jornadas.every((round) => round.fecha));
console.log("DEMO_FIXTURE_OK");
