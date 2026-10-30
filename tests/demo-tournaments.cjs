const assert = require("assert");
const Provider = require("../demo_2027_provider.js");

function complete(categoryId, teams, format) {
  const provider = new Provider();
  provider.setCategoryTeams(categoryId, teams);
  provider.generateFixture(categoryId, { start: "2027-04-04" });
  for (const match of provider.getMatches(categoryId)) provider.loadResult(categoryId, match.partido_numero, 80, 70);
  const prepared = provider.generatePlayoffs(categoryId, format, { seriesGames: 1 });
  assert.strictEqual(prepared.estado, "listo");
  for (let guard = 0; guard < 5; guard += 1) {
    const pending = provider.getPlayoffMatches(categoryId).filter((match) => match.puntos_local == null && match.local && match.visitante);
    for (const match of pending) provider.loadPlayoffResult(categoryId, match.partido_numero, match.modo_definicion === "global" && match.serie_partido === 2 ? 60 : 70, match.modo_definicion === "global" && match.serie_partido === 2 ? 70 : 60);
    const state = provider.advancePlayoffs(categoryId);
    if (state.estado === "finalizado") return provider.getChampion(categoryId);
  }
  throw new Error(`El torneo ${categoryId} no alcanzó campeón.`);
}

assert.ok(complete("maxi-a", ["A", "B", "C", "D"], 4));
assert.ok(complete("maxi-a", ["A", "B", "C", "D", "E", "F"], 6));
assert.ok(complete("maxi-a", ["A", "B", "C", "D", "E", "F", "G", "H"], 8));
assert.ok(complete("maxi-a", ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"], 8));
const simulated = new Provider();
const championship = simulated.simulateCompleteChampionship("maxi-a");
assert.ok(championship.champion);
assert.strictEqual(simulated.getPlayoffs("maxi-b").length, 0);
assert.strictEqual(simulated.getChampion("maxi-a"), championship.champion);

const isolated = new Provider();
isolated.setCategoryTeams("maxi-a", ["A", "B", "C", "D"]);
isolated.setCategoryTeams("maxi-b", ["W", "X", "Y", "Z"]);
isolated.generateFixture("maxi-a", { start: "2027-04-04" });
isolated.generateFixture("maxi-b", { start: "2027-04-04" });
isolated.generatePlayoffs("maxi-a", 4);
assert.strictEqual(isolated.getPlayoffMatches("maxi-b").length, 0);
assert.strictEqual(isolated.getMatches("maxi-a").length, isolated.getMatches("maxi-b").length);
console.log("DEMO_TOURNAMENTS_OK");
