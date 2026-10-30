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
for (const count of [5, 7]) {
  const teams = Array.from({ length: count }, (_, index) => `Equipo ${index + 1}`);
  const oneWheel = fixture.generateFixture(teams, "2027-04-04", [], 1, 1, 0);
  assert.strictEqual(oneWheel.jornadas.length, count);
  const descansos = Object.fromEntries(teams.map((team) => [team, 0]));
  oneWheel.jornadas.forEach((round) => { assert.ok(round.libre); descansos[round.libre]++; });
  assert.ok(Object.values(descansos).every((value) => value === 1));
  const twoWheel = fixture.generateFixture(teams, "2027-04-04", [], 1, 2, 0);
  const descansosDosRuedas = Object.fromEntries(teams.map((team) => [team, 0]));
  twoWheel.jornadas.forEach((round) => { assert.ok(round.libre); descansosDosRuedas[round.libre]++; });
  assert.ok(Object.values(descansosDosRuedas).every((value) => value === 2));
}
const sundayBlocked = fixture.generateFixture(["A", "B", "C", "D"], "2027-04-04", ["2027-04-11"], 1, 1, 0);
assert.ok(sundayBlocked.jornadas.every((round) => round.fecha !== "2027-04-11"));
assert.strictEqual(sundayBlocked.jornadas[1].fecha, "2027-04-18");
const wednesdayBlocked = fixture.generateFixture(["A", "B", "C", "D"], "2027-04-05", ["2027-04-14"], 1, 1, 3);
assert.ok(wednesdayBlocked.jornadas.every((round) => round.fecha !== "2027-04-14"));
assert.strictEqual(wednesdayBlocked.jornadas[1].fecha, "2027-04-21");
const twoWheels = fixture.generateFixture(["A", "B", "C", "D"], "2027-04-07", [], 1, 2, 3);
assert.strictEqual(twoWheels.matches.length, 12);
assert.ok(twoWheels.jornadas.every((round) => round.fecha));
const firstPair = new Set(twoWheels.jornadas.slice(0, 3).flatMap((round) => round.partidos.map((match) => `${match.local}|${match.visitante}`)));
const secondPair = new Set(twoWheels.jornadas.slice(3).flatMap((round) => round.partidos.map((match) => `${match.local}|${match.visitante}`)));
assert.strictEqual(firstPair.size, secondPair.size);
for (const pair of firstPair) { const [local, visitante] = pair.split("|"); assert.ok(secondPair.has(`${visitante}|${local}`)); }
assert.strictEqual(twoWheels.ultimaFecha, twoWheels.jornadas.at(-1).fecha);
console.log("DEMO_FIXTURE_OK");
