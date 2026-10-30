const assert = require("assert");
const fixture = require("../demo_2027_fixture.js");
const result = fixture.generateFixture(["A", "B", "C", "D"], "2027-04-05", ["2027-04-12"]);
assert.strictEqual(result.rounds, 3);
assert.strictEqual(result.matches.length, 6);
assert.ok(result.matches.every((match) => match.estado_resultado === "pendiente"));
assert.ok(result.matches.every((match) => match.fecha !== "2027-04-12"));
assert.strictEqual(new Set(result.matches.map((match) => `${match.local}-${match.visitante}`)).size, 6);
console.log("DEMO_FIXTURE_OK");
