"use strict";

const assert = require("node:assert/strict");
const Provider = require("../demo_2027_provider.js");

function finishRegular(provider, categoryId, teams) {
  provider.setCategoryTeams("asoc-demo", categoryId, teams);
  provider.generateFixture("asoc-demo", categoryId, { start: "2027-05-02", blocked: ["2027-05-09"] });
  const regular = provider.getMatches(categoryId);
  assert.ok(regular.length, `${categoryId}: fixture vacío`);
  assert.throws(() => provider.updateMatchSchedule("asoc-demo", categoryId, regular[0].partido_numero, { fecha: "2027-04-11" }), /bloqueada/);
  provider.updateMatchSchedule("asoc-demo", categoryId, regular[0].partido_numero, { fecha: "2027-05-16", hora: "20:00", cancha: "Municipal" });
  for (const match of regular) provider.loadResult(categoryId, match.partido_numero, 80, 70);
  assert.equal(provider.getMatches(categoryId).filter((match) => match.puntos_local != null).length, regular.length);
}

function finishSingleGameRounds(provider, categoryId, rounds) {
  for (const round of rounds) {
    const pending = provider.getPlayoffMatches(categoryId).filter((match) => match.ronda === round && match.puntos_local == null);
    assert.ok(pending.length, `${categoryId}: no hay partidos pendientes en ${round}`);
    for (const match of pending) provider.loadPlayoffResult(categoryId, match.partido_numero, 80, 70);
    provider.advancePlayoffs(categoryId);
  }
}

const top4 = new Provider();
finishRegular(top4, "maxi-a", ["A", "B", "C", "D"]);
top4.generatePlayoffs("maxi-a", 4, { seriesGames: 1 });
finishSingleGameRounds(top4, "maxi-a", ["semifinales", "final"]);
assert.ok(top4.getChampion("maxi-a"));

const top6 = new Provider();
finishRegular(top6, "maxi-a", ["A", "B", "C", "D", "E", "F"]);
top6.generatePlayoffs("maxi-a", 6, { seriesGames: 2 });
assert.equal(top6.getPlayoffMatches("maxi-a").filter((match) => match.ronda === "repechaje").length, 4);
for (const match of top6.getPlayoffMatches("maxi-a").filter((item) => item.ronda === "repechaje")) {
  top6.loadPlayoffResult("maxi-a", match.partido_numero, match.serie_partido === 1 ? 80 : 70, 60);
}
top6.advancePlayoffs("maxi-a");
for (const round of ["semifinales", "final"]) {
  const pending = top6.getPlayoffMatches("maxi-a").filter((match) => match.ronda === round && match.puntos_local == null);
  const winners = new Map();
  for (const match of pending) {
    const winner = winners.get(match.llave) || match.local;
    winners.set(match.llave, winner);
    top6.loadPlayoffResult("maxi-a", match.partido_numero, match.local === winner ? 80 : 60, match.local === winner ? 60 : 80);
  }
  top6.advancePlayoffs("maxi-a");
}
assert.ok(top6.getChampion("maxi-a"));

const top8 = new Provider();
finishRegular(top8, "maxi-a", ["A", "B", "C", "D", "E", "F", "G", "H"]);
top8.generatePlayoffs("maxi-a", 8, { seriesGames: 1 });
finishSingleGameRounds(top8, "maxi-a", ["cuartos", "semifinales", "final"]);
assert.ok(top8.getChampion("maxi-a"));

console.log("APDB_CHAMPIONSHIP_SCENARIO_OK");
