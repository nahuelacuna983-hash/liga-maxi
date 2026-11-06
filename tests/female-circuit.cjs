"use strict";
const assert = require("node:assert/strict");
const Provider = require("../demo_2027_provider.js");

const provider = new Provider();
const categoryId = "femenino";
const actor = "asoc-demo";
const players = [
  ["female-player-1", "Femenino Norte"],
  ["female-player-2", "Femenino Sur"],
  ["female-player-3", "Femenino Centro"],
  ["female-player-4", "Femenino Oeste"],
];

const category = provider.getCategory(categoryId);
assert.equal(category.nombre, "Femenino");
assert.equal(category.equipos.length, 4);
for (const [id, team] of players) {
  provider.registerPlayer(actor, { id, nombre: `Jugadora sintética ${id}`, equipo: team, categoria: categoryId });
}
const fixture = provider.generateFixture(actor, categoryId, { start: "2027-04-04" });
assert.equal(fixture.matches.length, 6);
for (const match of fixture.matches) provider.loadResult(categoryId, match.partido_numero, 80, 70);
const table = provider.getTable(categoryId);
assert.equal(table.length, 4);
assert.ok(table.every((row) => row.pj > 0));
const playoffs = provider.generatePlayoffs(categoryId, 4, { publicationState: "projection" });
assert.equal(playoffs.formato, "top4");
assert.equal(playoffs.matches.length, 2);
for (const match of playoffs.matches) provider.loadPlayoffResult(categoryId, match.partido_numero, 80, 70);
const semifinales = provider.advancePlayoffs(categoryId);
assert.equal(semifinales.estado, "clasificados_avanzados");
const finalMatches = provider.getPlayoffMatches(categoryId).filter((match) => match.ronda === "final" && match.puntos_local == null);
assert.equal(finalMatches.length, 1);
for (const match of finalMatches) provider.loadPlayoffResult(categoryId, match.partido_numero, 80, 70);
const closed = provider.advancePlayoffs(categoryId);
assert.equal(closed.estado, "finalizado");
assert.ok(provider.getChampion(categoryId));
console.log("FEMALE_CIRCUIT_OK");
