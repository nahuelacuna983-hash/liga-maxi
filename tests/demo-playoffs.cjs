const assert = require("assert");
const Provider = require("../demo_2027_provider.js");

const provider = new Provider();
provider.generateFixture("maxi-a", { start: "2027-04-04" });
const table = provider.getTable("maxi-a");
assert.strictEqual(table.length, 4);

for (const top of [4, 6, 8]) {
  const playoffs = provider.generatePlayoffs("maxi-a", top);
  assert.strictEqual(playoffs.formato, `top${top}`);
  assert.ok(playoffs.matches.length > 0);
  assert.ok(playoffs.matches.every((match) => match.puntos_local === null && match.puntos_visitante === null));
}

assert.throws(() => provider.generatePlayoffs("maxi-a", 5), /no definido/);
const top8 = provider.generatePlayoffs("maxi-a", 8);
assert.ok(top8.matches.every((match) => match.ronda === "cuartos"));
const top6 = provider.generatePlayoffs("maxi-a", 6);
assert.ok(top6.matches.every((match) => match.ronda === "repechaje" && match.modo_definicion === "global"));
const first = top6.matches[0];
provider.loadPlayoffResult("maxi-a", first.partido_numero, 70, 60);
assert.strictEqual(provider.getPlayoffMatches("maxi-a")[0].puntos_local, 70);
assert.strictEqual(provider.getPlayoffMatches("maxi-b").length, 0);
assert.throws(() => provider.loadPlayoffResult("maxi-a", first.partido_numero, 60, 60), /no puede terminar empatado/);
console.log("DEMO_PLAYOFFS_OK");
