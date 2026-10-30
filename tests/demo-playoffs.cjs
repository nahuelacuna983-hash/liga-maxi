const assert = require("assert");
const Provider = require("../demo_2027_provider.js");

const provider = new Provider();
provider.setCategoryTeams("asoc-demo", "maxi-a", ["A", "B", "C", "D", "E", "F", "G", "H"]);
provider.generateFixture("asoc-demo", "maxi-a", { start: "2027-04-04" });
const table = provider.getTable("maxi-a");
assert.strictEqual(table.length, 8);

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
assert.notStrictEqual(top6.matches[0].local, top6.matches[1].local);
const first = top6.matches[0];
for (const match of top6.matches) provider.loadPlayoffResult("maxi-a", match.partido_numero, match.serie_partido === 1 ? 70 : 60, match.serie_partido === 1 ? 60 : 70);
assert.strictEqual(provider.getPlayoffMatches("maxi-a")[0].puntos_local, 70);
const top6Advanced = provider.advancePlayoffs("maxi-a");
assert.deepStrictEqual(top6Advanced.matches.filter((match) => match.ronda === "semifinales").map((match) => match.local), ["A", "B"]);
assert.strictEqual(provider.getPlayoffMatches("maxi-b").length, 0);
assert.throws(() => provider.loadPlayoffResult("maxi-a", first.partido_numero, 60, 60), /ya tiene resultado/);

provider.generatePlayoffs("maxi-a", 4, { seriesGames: 1 });
for (const match of provider.getPlayoffMatches("maxi-a")) provider.loadPlayoffResult("maxi-a", match.partido_numero, 70, 60);
let state = provider.advancePlayoffs("maxi-a");
assert.strictEqual(state.estado, "clasificados_avanzados");
for (const match of provider.getPlayoffMatches("maxi-a").filter((item) => item.ronda === "final")) provider.loadPlayoffResult("maxi-a", match.partido_numero, 70, 60);
state = provider.advancePlayoffs("maxi-a");
assert.strictEqual(state.estado, "finalizado");
assert.ok(provider.getChampion("maxi-a"));
const championBeforeAnnul = provider.getChampion("maxi-a");
const completedFinal = provider.getPlayoffMatches("maxi-a").find((match) => match.ronda === "final" && match.puntos_local != null);
provider.annulPlayoffResult("maxi-a", completedFinal.partido_numero);
assert.strictEqual(provider.getChampion("maxi-a"), null);
assert.notStrictEqual(championBeforeAnnul, null);
provider.generatePlayoffs("maxi-a", 4, { seriesGames: 3 });
for (const match of provider.getPlayoffMatches("maxi-a")) provider.loadPlayoffResult("maxi-a", match.partido_numero, match.serie_partido <= 2 ? 80 : 60, match.serie_partido <= 2 ? 60 : 70);
let bestOfThree = provider.advancePlayoffs("maxi-a");
assert.strictEqual(bestOfThree.matches.filter((match) => match.ronda === "final").length, 3);
const finalMatch = provider.getPlayoffMatches("maxi-a").find((match) => match.ronda === "final");
provider.loadPlayoffResult("maxi-a", finalMatch.partido_numero, 80, 70);
provider.annulPlayoffResult("maxi-a", finalMatch.partido_numero);
assert.strictEqual(provider.getPlayoffMatches("maxi-a").find((match) => match.partido_numero === finalMatch.partido_numero).puntos_local, null);
assert.strictEqual(provider.advancePlayoffs("maxi-a").estado, "pendiente_resultados");
provider.generatePlayoffs("maxi-b", 8);
assert.strictEqual(provider.getPlayoffMatches("maxi-b").length, 0);
assert.strictEqual(provider.getPlayoffs("maxi-b").estado, "pendiente_clasificados");
console.log("DEMO_PLAYOFFS_OK");
